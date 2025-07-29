// src/routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

module.exports = (pool) => {
    const router = express.Router();

    // Middleware to check if the user is authenticated
    const isAuthenticated = (req, res, next) => {
        // console.log('Checking authentication for:', req.path);
        // console.log('Session userId:', req.session.userId);
        
        if (req.session.userId) {
            // User is authenticated, proceedSession userId: to the next middleware or route handler
            // console.log('User is authenticated, proceeding...');
            next();
        } else {
            // User is not authenticated
            console.log('User is not authenticated, original URL:', req.originalUrl);
            
            // Store the original URL in session so we can redirect back after login
            if (req.originalUrl !== '/login') {
                req.session.returnTo = req.originalUrl;
                console.log('Stored returnTo URL:', req.session.returnTo);
            }
            
            // If it's an API request (e.g., fetching /parcels data), send 401 JSON response
            // Otherwise (for HTML page requests), redirect to the login page
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(401).json({ message: 'Unauthorized: Please log in.' });
            } else {
                return res.redirect('/login'); // Redirect to /login
            }
        }
    };

    // --- Authentication Routes ---

    // The actual login POST endpoint
    router.post('/auth/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        try {
            const result = await pool.query(
                'SELECT party_id, contact_email, password_hash, staff_role FROM public.parties WHERE contact_email = $1',
                [email]
            );
            const user = result.rows[0];
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }
            req.session.userId = user.party_id;
            req.session.userEmail = user.contact_email;
            req.session.userRole = user.staff_role;
            console.log(`User ${user.contact_email} logged in successfully. Session ID set to:`, req.session.userId);
            
            // Get the return URL from session, default to dashboard
            const redirectUrl = req.session.returnTo || '/';
            console.log('Redirecting to:', redirectUrl);
            
            // Clear the returnTo URL from session
            delete req.session.returnTo;
            
            // Redirect to the original requested page or dashboard after successful login
            res.status(200).json({ message: 'Login successful!', redirect: redirectUrl });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server error during login.' });
        }
    });

    // Route for adding a new party (protected)
    router.post('/auth/add-party', isAuthenticated, async (req, res) => {
        const {
            partyType, firstName, lastName, organizationName, email, password,
            kraPin, contactPhone, address, staffRole
        } = req.body;
        if (!partyType || !email || !password) {
            return res.status(400).json({ message: 'Party Type, Email, and Password are required.' });
        }
        if ((partyType === 'admin' || partyType === 'individual') && (!firstName || !lastName)) {
            return res.status(400).json({ message: 'First Name and Last Name are required for Individuals/Admins.' });
        }
        if (partyType === 'organization' && !organizationName) {
            return res.status(400).json({ message: 'Organization Name is required for Organizations.' });
        }
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            let queryText;
            let queryValues;
            if (partyType === 'admin' || partyType === 'individual') {
                queryText = `
                    INSERT INTO public.parties (
                        party_type, first_name, last_name, contact_email, password_hash, kra_pin,
                        contact_phone, address, staff_role, date_created, date_updated
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING party_id`;
                queryValues = [
                    partyType, firstName, lastName, email, hashedPassword, kraPin || null,
                    contactPhone || null, address || null, (partyType === 'admin' ? 'admin' : null)
                ];
            } else if (partyType === 'organization') {
                queryText = `
                    INSERT INTO public.parties (
                        party_type, organization_name, contact_email, password_hash, kra_pin,
                        contact_phone, address, date_created, date_updated
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING party_id`;
                queryValues = [
                    partyType, organizationName, email, hashedPassword, kraPin || null,
                    contactPhone || null, address || null
                ];
            }
            const result = await pool.query(queryText, queryValues);
            console.log(`New ${partyType} added with ID: ${result.rows[0].party_id}`);
            res.status(201).json({ message: `New ${partyType} added successfully!` });
        } catch (error) {
            console.error('Error adding party:', error);
            if (error.code === '23505') {
                return res.status(409).json({ message: 'Email already exists.' });
            }
            res.status(500).json({ message: 'Server error adding party.' });
        }
    });

    // Logout route
    router.get('/auth/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ message: 'Could not log out.' });
            }
            res.clearCookie('connect.sid');
            res.redirect('/login'); // Redirect to /login
        });
    });

    // --- HTML Pages Routes ---

    // Login page route (NOT protected)
    router.get('/login', (req, res) => {
        console.log('Login page requested. Current session userId:', req.session.userId);
        // If user is already logged in, redirect them to the dashboard
        if (req.session.userId) {
            console.log('User already logged in, redirecting to dashboard');
            return res.redirect('/');
        }
        console.log('Serving login page');
        res.sendFile(path.join(__dirname, '..', 'login.html'));
    });

    // The root route '/' will now serve index.html and be protected
    router.get('/', isAuthenticated, (req, res) => {
        console.log('Dashboard requested for user:', req.session.userId);
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    });

    router.get('/admin-portal', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'docs', 'admin-portal.html'));
    });

    router.get('/documentation', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'docs', 'documentation.html'));
    });

    router.get('/parcel-search', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'docs', 'parcel-search.html'));
    });

    router.get('/parcels-viewer', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'docs', 'parcels-viewer.html'));
    });

    router.get('/permit-applications', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'docs', 'permit-applications.html'));
    });

    router.get('/property-registration', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'docs', 'property-registration.html'));
    });

    router.get('/parcel-details', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'docs', 'parcel-details.html'));
    });


    // --- Parcel Data Routes (API) ---
    router.get('/parcels', isAuthenticated, async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    p.parcel_id,
                    p.parcel_number,
                    p.area_sqm,
                    ST_AsGeoJSON(p.geom)::json AS geometry,
                    p.registration_section_id,
                    rs.name AS registration_section_name,
                    p.current_land_use_type_id,
                    lut.description AS land_use_description
                FROM
                    public.parcels p
                LEFT JOIN
                    public.registration_sections rs ON p.registration_section_id = rs.registration_section_id
                LEFT JOIN
                    public.land_use_types lut ON p.current_land_use_type_id = lut.land_use_type_id;
            `);
            const geojson = {
                type: 'FeatureCollection',
                features: result.rows.map(row => ({
                    type: 'Feature',
                    geometry: row.geometry,
                    properties: {
                        parcel_id: row.parcel_id,
                        parcel_number: row.parcel_number, // Ensure consistent naming
                        area_sqm: row.area_sqm,             // Ensure consistent naming
                        registration_section_id: row.registration_section_id,
                        registration_section_name: row.registration_section_name,
                        current_land_use_type_id: row.current_land_use_type_id,
                        land_use_description: row.land_use_description
                    }
                }))
            };
            res.json(geojson);
        } catch (error) {
            console.error('Error fetching parcels:', error);
            res.status(500).json({ message: 'Error fetching parcel data.' });
        }
    });

    router.get('/api/parcel-details/:parcelId', isAuthenticated, async (req, res) => {
        const { parcelId } = req.params;
        try {
            const parcelResult = await pool.query(`
                SELECT
                    p.parcel_id,
                    p.parcel_number,
                    p.area_sqm,
                    ST_AsGeoJSON(p.geom)::json AS geometry,
                    p.registration_section_id,
                    rs.name AS registration_section_name,
                    p.current_land_use_type_id,
                    lut.description AS land_use_description,
                    lut.zoning_code
                FROM
                    public.parcels p
                LEFT JOIN
                    public.registration_sections rs ON p.registration_section_id = rs.registration_section_id
                LEFT JOIN
                    public.land_use_types lut ON p.current_land_use_type_id = lut.land_use_type_id
                WHERE
                    p.parcel_id = $1;
            `, [parcelId]);

            if (parcelResult.rows.length === 0) {
                return res.status(404).json({ message: 'Parcel not found.' });
            }
            const parcel = parcelResult.rows[0];

            // Fetch all parties associated with this parcel via RRRs
            const ownersResult = await pool.query(`
                SELECT DISTINCT
                    pt.party_id,
                    pt.party_type,
                    pt.first_name,
                    pt.last_name,
                    pt.organization_name,
                    COALESCE(pt.first_name || ' ' || pt.last_name, pt.organization_name) AS display_name, -- Added display_name
                    pt.national_id_or_registration_number,
                    pt.contact_email,
                    pt.contact_phone,
                    pt.kra_pin
                FROM
                    public.rrrs r
                JOIN
                    public.parties pt ON r.party_id = pt.party_id
                WHERE
                    r.parcel_id = $1;
            `, [parcelId]);

            const rrrsResult = await pool.query(`
                SELECT
                    rrr_type, description, valid_from_date, valid_to_date,
                    COALESCE(pt.first_name || ' ' || pt.last_name, pt.organization_name) AS party_name
                FROM
                    public.rrrs r
                LEFT JOIN
                    public.parties pt ON r.party_id = pt.party_id
                WHERE
                    r.parcel_id = $1;
            `, [parcelId]);

            const valuationsResult = await pool.query(`
                SELECT
                    market_value, valuation_date, assessed_value, valuation_notes,
                    COALESCE(pt.first_name || ' ' || pt.last_name, pt.organization_name) AS valuer_name
                FROM
                    public.valuations v
                LEFT JOIN
                    public.parties pt ON v.valuer_party_id = pt.party_id
                WHERE
                    v.parcel_id = $1;
            `, [parcelId]);

            res.json({
                parcel: {
                    id: parcel.parcel_id,
                    number: parcel.parcel_number,
                    area: parcel.area_sqm,
                    geometry: parcel.geometry,
                    registrationSection: parcel.registration_section_name,
                    landUse: parcel.land_use_description,
                    zoningCode: parcel.zoning_code
                },
                owners: ownersResult.rows,
                rrrs: rrrsResult.rows,
                valuations: valuationsResult.rows
            });

        } catch (error) {
            console.error(`Error fetching details for parcel ${parcelId}:`, error);
            res.status(500).json({ message: 'Error fetching parcel details.' });
        }
    });

    // API endpoint for parcel search by number
    router.get('/api/parcel-search', isAuthenticated, async (req, res) => {
        const { query } = req.query; // Get search query from URL parameters
        if (!query || query.trim() === '') {
            return res.json([]); // Return empty array if no query
        }

        try {
            // Use ILIKE for case-insensitive search
            const result = await pool.query(`
                SELECT
                    parcel_id,
                    parcel_number,
                    area_sqm,
                    registration_section_id,
                    (SELECT name FROM public.registration_sections WHERE registration_section_id = p.registration_section_id) AS registration_section_name
                FROM
                    public.parcels p
                WHERE
                    parcel_number ILIKE $1 || '%' -- Search for parcel numbers starting with the query
                ORDER BY
                    parcel_number
                LIMIT 10;
            `, [`%${query}%`]);

            res.json(result.rows);
        } catch (error) {
            console.error('Error during parcel search:', error);
            res.status(500).json({ message: 'Error performing parcel search.' });
        }
    });

    return router;
};
