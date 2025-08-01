Land Administration and Document Management System
Project Overview
This web-based application is designed to modernize and streamline land administration processes. It provides a centralized platform for managing land-related data, enabling interactive parcel viewing, efficient property search, secure property registration, and digital permit applications. The system focuses on a user-centric experience, aiming to provide a functional and intuitive platform for land management.

Features
Secure User Authentication: Robust login system with differentiated access for various user roles (e.g., administrators, organizations, individuals).

Interactive Parcel Viewer: Comprehensive map-based display of registered land parcels, allowing users to browse and understand geographical data.

Detailed Parcel Information: View extensive details for individual parcels, including area, registration section, land use, and associated data.

Efficient Parcel Search: Intuitive search interface to quickly locate parcels by various criteria (e.g., parcel number, owner).

Property Registration: Streamlined form-based process for submitting new property registrations and associated documents.

Permit Applications: Digital interface for submitting and tracking various land-use permit applications.

User Management: Administrative tools for managing user accounts and roles.

Spatial Data Management: Integration with GeoServer for uploading and updating geospatial data (shapefiles) in the database.

Technologies Used
Frontend
HTML: Structure and content of web pages.

CSS: Styling and layout (responsive design principles applied).

JavaScript: Client-side interactivity and dynamic content.

Figma: UI/UX design and prototyping.

Mapping Library: (e.g., Leaflet.js) for interactive map displays.

Backend
Node.js: Server-side JavaScript runtime.

Express.js: Web application framework for Node.js.

PostgreSQL: Relational database for persistent data storage.

PostGIS: Spatial database extender for PostgreSQL.

GeoServer: Open-source server for sharing, processing, and editing geospatial data.

Key Node.js Dependencies
pg: PostgreSQL client for Node.js.

express-session: Middleware for session management.

bcrypt: For password hashing and security.

jsonwebtoken: For secure authentication tokens.

dotenv: For managing environment variables.

Installation and Setup
To set up this project locally, follow these steps:

Clone the repository:

git clone <your-repository-url>
cd <your-repository-name>

Install Node.js dependencies:

npm install

Set up PostgreSQL Database:

Ensure PostgreSQL with PostGIS extension is installed and running.

Create a new database (e.g., parceldb).

Execute the SQL schema from sql/lads.sql to set up tables and relationships.

Configure Environment Variables:

Create a .env file in the root directory.

Add your database connection details and session secret:

DB_USER=your_db_user
DB_HOST=your_db_host
DB_DATABASE=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
SESSION_SECRET=a_very_secret_string_for_sessions
PORT=4000

Run GeoServer (if using for data updates):

Configure GeoServer to connect to your PostgreSQL/PostGIS database.

Publish your spatial layers as WMS/WFS services.

Start the server:

npm start

The application should now be running, typically accessible at http://localhost:4000.

Usage
Navigate to the root URL (http://localhost:4000) to see the main dashboard.

Access the login page at /login to authenticate.

Explore different modules like /parcels-viewer, /parcel-search, /property-registration, and /permit-applications through the dashboard links or direct navigation.

Screenshots
(Insert screenshots of your application's key functionalities here, such as the Login Page, Main Dashboard, Parcels Viewer, Parcel Search, Property Registration Form, etc. You can also include Figma mockups alongside the implemented views.)

Contributing
Contributions are welcome! If you find any bugs or have suggestions for improvements, please open an issue or submit a pull request.

License
This project is licensed under the [Specify Your License Here, e.g., MIT License] - see the LICENSE.md file for details.