# MCTED System

MCTED (Municipal Community Tool and Equipment Donation/Bank System) is a lightweight web-based application for managing municipal equipment lending, reservations, rentals, maintenance, notifications, and user accounts.

This project uses a Node.js + Express backend with a static frontend served from the `public` directory. The current data layer is a file-based JSON database under `db/data`, which makes local setup and testing simple without requiring a full database service.

## Project Overview

The system is designed to support:

- Public browsing of equipment catalog items
- User registration and authentication
- Reservation and rental workflows
- Maintenance and repair tracking
- Notifications and dashboard summaries
- User management and profile updates
- Municipal access control and role-based behavior

## Features

- Equipment catalog and search flows
- Equipment codes, category/availability/condition filters, and available-versus-total inventory on catalog cards
- Equipment details, availability status, and in-stock reservation shortcuts
- Reservation and rental management
- User login and registration
- Session-based authentication using cookies
- Password hashing with bcrypt
- Profile and account management
- Approval-based resident information update requests with reviewer and value-change audit history
- Notification dropdown with unread indicators, mark-read actions, individual deletion, and clear-all controls
- Dashboard with trends and summary cards
- Maintenance tracking for tools and equipment
- Review/feedback collection

## Current Repository Structure

```text
MCTED_System/
├── db/
│   ├── data/
│   ├── database.js
│   ├── schema.sql
│   └── seed.js
├── public/
│   ├── css/
│   ├── images/
│   ├── js/
│   ├── uploads/
│   ├── index.html
│   └── receipt-print.html
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── repositories/
│   └── routes/
├── .gitignore
├── package.json
├── package-lock.json
├── pnpm-lock.yaml
├── server.js
├── tests/
└── README.md
```

## Technology Stack

- Node.js
- Express.js
- JavaScript
- bcryptjs
- cookie-parser
- cors
- multer
- File-based JSON persistence under `db/data`

## Prerequisites

Before running the project, make sure you have the following installed:

- Node.js 20 or later
- npm or pnpm
- Git

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd MCTED_System
```

2. Install dependencies:

```bash
npm install
```

If you prefer pnpm:

```bash
pnpm install
```

## Database Setup

This project uses a JSON-based database implementation. No separate database server is required for local development.

The database layer is initialized in:

- `db/database.js`
- `db/data/`

The system automatically creates the required JSON files when it starts if they do not already exist.

### Initial data

If you want to seed initial records, you can review or run the scripts in:

- `db/seed.js`
- `db/schema.sql`

For local development, the app is designed to create the data files automatically, so a manual database setup is usually unnecessary.

## Environment Variables

The current app is built for local development and does not require a `.env` file by default.

Optional variables you may use:

```bash
PORT=3000
NODE_ENV=development
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-account
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@example.com
STAFF_REGISTRATION_PASSCODE=choose-a-long-random-value
ADMIN_REGISTRATION_PASSCODE=choose-another-long-random-value
```

The app does not currently load `.env` files automatically. Set SMTP values in the process environment before starting the server. SMTP configuration is required for registration email verification and password reset codes; those flows report an error if mail delivery is unavailable. Do not commit SMTP credentials.

Authentication uses random, HTTP-only session cookies backed by hashed tokens in the JSON database. Production deployments must use HTTPS (`NODE_ENV=production`) so cookies are marked Secure.
Optional staff/administrator self-registration requires the respective passcode above; keep both codes private and do not reuse the SMTP password.
First name, middle name, last name, birthday, barangay, house number, and street address are read-only on a resident profile. Residents can submit a reasoned update request, and municipal staff or administrators can approve or reject it; decisions and before/after values are recorded.
Changing an account email requires a code delivered to the new address. Profile photos accept JPG, PNG, or WebP images up to 350 KB. Contact number updates remain disabled until an SMS/phone verification provider is configured.

## Frontend Setup

The frontend is served as static files from `public/`.

- Main entry page: `public/index.html`
- Client-side logic: `public/js/`
- Static assets: `public/images/` and `public/uploads/`
- Styles: `public/css/`

No separate frontend build step is required in the current version.

## Backend Setup

The backend is initialized in `server.js`.

Key backend folders:

- `server/controllers/` — request handlers
- `server/routes/` — API route definitions
- `server/middleware/` — authentication and request checks
- `server/repositories/` — data access layer
- `server/config/` — constants and app config

## Running the System

Start the server from the project root:

```bash
node server.js
```

The app will run at:

```text
http://localhost:3000
```

If you want to run in a different port:

```bash
PORT=4000 node server.js
```

## Build Instructions

This project does not currently use a frontend build pipeline. The static frontend is served directly, so there is no separate build command required.

If you make code changes, simply restart the Node server or reload the browser page.

## Deployment Guide

For a basic deployment:

1. Ensure Node.js is installed on the target machine.
2. Copy the project files to the server.
3. Run:

```bash
npm install --production
```

4. Start the app:

```bash
NODE_ENV=production PORT=3000 node server.js
```

5. Configure reverse proxy settings if needed (Nginx or Apache).
6. Make sure the app has permission to read/write the `db/data/` folder.

For production, consider:

- using a real database backend
- adding environment-based secrets and configuration
- enabling HTTPS
- hardening cookie settings and session management
- adding automated backups for the data directory

## Troubleshooting

### Port already in use

If port 3000 is already in use, either stop the other process or run the app on a different port:

```bash
PORT=4000 node server.js
```

### Missing or broken data files

Ensure the `db/data/` directory exists and is writable:

```bash
mkdir -p db/data
```

### Dependencies not installing

Delete the old install artifacts and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### App loads but features do not work

Check the terminal logs for runtime errors. Common issues include:

- malformed JSON in the data files
- missing files in `db/data/`
- invalid route or controller references
- permissions problems on the data directory

### Static files not loading

Verify that the `public` folder and its subdirectories exist and that the `server.js` static path is pointing to the correct location.

## Notes for Developers

- The frontend is intentionally lightweight and is served as static HTML/CSS/JS.
- Authentication is cookie-based and session-aware through Express middleware.
- The data layer is simple and local, which is suitable for demos and small municipal deployments.
- This project is currently structured as a minimal full-stack app without a strict frontend/backend separation at the filesystem level.

## License

This project currently uses the ISC license as indicated in `package.json`.

---

This README is intended to help a new developer clone the project, install dependencies, configure the local data layer, and run the system without additional instructions.
