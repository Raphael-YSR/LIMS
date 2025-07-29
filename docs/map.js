// Function to hide the custom popup
function hideCustomPopup() {
    const popup = document.getElementById('parcelInfoPopup');
    if (popup) {
        popup.classList.remove('visible'); // Trigger transition out
        // Use a timeout to ensure transition completes before hiding
        setTimeout(() => {
            popup.classList.add('hidden');    // Fully hide after transition
        }, 300); // Match CSS transition duration
    }
}

// Function to show the custom popup and populate its data
function showCustomPopup(properties) {
    const popup = document.getElementById('parcelInfoPopup');
    if (!popup) {
        console.error("Popup element 'parcelInfoPopup' not found.");
        return;
    }

    // Ensure parcel_number is used for the popup title
    document.getElementById('popupParcelNo').textContent = `PARCEL NUMBER ${properties.parcel_number || 'N/A'}`;
    console.log("Popup Parcel Number (from properties):", properties.parcel_number);

    // Calculate and format area for popup (X.XXX HA)
    const areaSqM = parseFloat(properties.area_sqm); // Ensure we're accessing area_sqm
    let formattedArea = 'N/A';
    if (!isNaN(areaSqM)) {
        const areaHa = areaSqM / 10000; // 1 hectare = 10,000 square meters
        formattedArea = `${areaHa.toFixed(3)} HA`; // Format to 3 decimal places for hectares
    }
    document.getElementById('popupArea').textContent = formattedArea;
    console.log("Popup Area (formatted for HA):", formattedArea);


    // Populate Land Use and Registration Section from fetched data
    document.getElementById('popupRegSection').textContent = properties.registration_section_name || 'N/A';
    document.getElementById('popupLandUse').textContent = properties.land_use_description || 'N/A';

    // Set parcel_id on the "View Details" button for navigation
    const viewDetailsButton = document.getElementById('viewDetailsButton');
    if (viewDetailsButton) {
        if (properties.parcel_id) {
            viewDetailsButton.href = `/parcel-details?parcelId=${properties.parcel_id}`;
            console.log(`Setting view details link to: ${viewDetailsButton.href}`);
        } else {
            viewDetailsButton.href = '#'; // Fallback if no parcel_id
            console.warn("No parcel_id found for view details button.");
        }
    } else {
        console.error("View details button 'viewDetailsButton' not found.");
    }


    popup.classList.remove('hidden');
    // Force reflow to ensure transition plays
    void popup.offsetWidth;
    popup.classList.add('visible'); // Trigger transition in
    console.log("Custom popup shown.");
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded for map.js');

    // Show loading indicator
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.classList.remove('hidden');
        console.log('Loading indicator shown.');
    } else {
        console.warn('Loading indicator element not found.');
    }


    // Initialize the map with a view centered on Kenya (near Nairobi) and a suitable zoom level
    let map;
    try {
        map = L.map('map', { zoomControl: false }).setView([-1.286389, 36.817223], 7);
        console.log('Leaflet map initialized successfully.');
    } catch (e) {
        console.error('Error initializing Leaflet map:', e);
        // Display a message on the page if map fails to initialize
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
             mapContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-red-800 text-white text-center p-4 rounded-lg shadow-lg">
                <p>Error initializing map: ${e.message}. Please check console.</p>
            </div>`;
        }
        if (loadingDiv) loadingDiv.classList.add('hidden'); // Hide loading if map init fails
        return; // Stop execution if map fails to init
    }


    // Define the CARTO basemap layer
    const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    });

    /*
    var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    });
    */
    // Add the CARTO layer to the map
    cartoLayer.addTo(map);
    //CartoDB_DarkMatter.addTo(map);

    console.log('Basemap layer added to map.');


    // Function to style the parcels
    function parcelStyle(feature) {
        return {
            fillColor: '#007bff', // Translucent blue fill
            weight: 1,
            opacity: 1,
            color: 'black',      // Continuous black border
            dashArray: '0',      // No dash for continuous line
            fillOpacity: 0.8     // Slightly more translucent for better visibility of basemap
        };
    }

    // Function to handle click events on parcels
    async function onEachFeature(feature, layer) {
        // Ensure properties and parcel_number/area_sqm are available
        // Normalize property names for consistency from backend data to expected JS properties
        const normalizedProperties = { ...feature.properties };
        if (!normalizedProperties.parcel_number && normalizedProperties.parcelno) {
            normalizedProperties.parcel_number = normalizedProperties.parcelno;
        }
        // Ensure area_sqm is a number, handling potential string inputs
        if (typeof normalizedProperties.area_sqm === 'string') {
            normalizedProperties.area_sqm = parseFloat(normalizedProperties.area_sqm);
        } else if (!normalizedProperties.area_sqm && typeof normalizedProperties.area === 'string') {
             // Fallback to 'area' if 'area_sqm' is missing but 'area' is present
            normalizedProperties.area_sqm = parseFloat(normalizedProperties.area);
        }

        if (!normalizedProperties.parcel_id && normalizedProperties.id) {
            normalizedProperties.parcel_id = normalizedProperties.id;
        }

        if (normalizedProperties.parcel_number) { // Only add click listener if we have a parcel number
            layer.on('click', (e) => {
                console.log('Parcel clicked:', normalizedProperties.parcel_number);
                console.log('Properties sent to showCustomPopup:', normalizedProperties);
                showCustomPopup(normalizedProperties); // Pass the normalized properties
            });
        }
    }

    // Fetch parcel data from your Node.js Express server
    console.log('Attempting to fetch parcel data from /parcels...');
    fetch('/parcels')
        .then(response => {
            console.log('Fetch response status:', response.status);
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Authentication required. Redirecting to login.');
                    window.location.href = '/login.html'; // Redirect to login
                    return Promise.reject('Authentication required. Redirecting to login.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(geojson => {
            console.log('GeoJSON data received. Features:', geojson.features ? geojson.features.length : 'none');

            if (!geojson.features || geojson.features.length === 0) {
                console.warn('No parcel features found in the data. Displaying message.');
                if (loadingDiv) loadingDiv.classList.add('hidden');
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-300 text-center p-4 rounded-lg shadow-lg">
                        <p>No parcel data available to display. Try adding some parcels.</p>
                    </div>`;
                }
                return; // Stop execution if no features
            }

            // The normalization should happen in onEachFeature, but also ensure initial data looks okay
            // No need to map features here again, as onEachFeature handles normalization per click
            // However, ensuring the GeoJSON itself is well-formed for initial layer creation
            const parcelLayer = L.geoJSON(geojson, {
                style: parcelStyle,
                onEachFeature: onEachFeature
            });

            parcelLayer.addTo(map);
            console.log('Parcel layer added to map.');

            try {
                const bounds = parcelLayer.getBounds();
                console.log('Parcel bounds:', bounds);
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [20, 20] });
                    console.log('Map fitted to parcel bounds.');
                } else {
                    console.warn('Invalid bounds, keeping default map view.');
                }
            } catch (boundsError) {
                console.error('Error fitting map bounds:', boundsError);
            }

            if (loadingDiv) loadingDiv.classList.add('hidden');
            console.log('Loading indicator hidden.');
        })
        .catch(error => {
            console.error('Error loading parcel data or processing GeoJSON:', error);
            if (!error.message.includes('Authentication required')) {
                if (loadingDiv) loadingDiv.classList.add('hidden');
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-red-800 text-white text-center p-4 rounded-lg shadow-lg">
                        <p>Error loading map data: ${error.message}. Please check the browser console for more details.</p>
                    </div>`;
                }
            }
        });

    // Check if the map container has dimensions after a short delay
    setTimeout(() => {
        const mapElement = document.getElementById('map');
        if (mapElement) {
            const rect = mapElement.getBoundingClientRect();
            console.log(`Map container dimensions: Width=${rect.width}px, Height=${rect.height}px`);
            if (rect.width === 0 || rect.height === 0) {
                console.warn('Map container has zero dimensions. This could be causing the "black canvas" issue.');
                console.warn('Ensure the map container element (#map) has explicit width and height CSS properties.');
            }
        }
    }, 1000); // Check after 1 second
});
