# MCTED System

**Municipality Community Tool and Equipment Bank (MCTED)** is a web system that lets residents of the municipality browse, reserve, rent, and return community tools and equipment (farm tools, fishing equipment, carpentry, electrical, emergency gear, and more), while municipal staff manage inventory, payments, and maintenance.

Built for a small community (Batanes), so it uses lightweight JSON file storage, runs on a single computer, and has a low-bandwidth mode for slow connections.

## Features

- Tool catalog with categories, photos, condition, status, and daily rates
- Reservations with date-conflict checking
- Rentals and returns with condition logging, late fees, and damage fees
- Payment portal with printable receipts
- Inventory manager and maintenance/repair tracking
- User directory and role-based access (Resident, Staff, Administrator)
- Information update requests (residents ask the municipality to correct official data)
- Community reviews and ratings
- Notifications
- Low-bandwidth mode and mobile-friendly layout
- Persistent light/dark theme preference

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Tailwind CSS utilities, JavaScript |
| Backend | Node.js (server.js) |
| Data storage | JSON files in `db/data/` |
| Language | JavaScript runtime with TypeScript checking and typed API contracts |
| Tests | `tests/` folder |

## Requirements

- [Node.js](https://nodejs.org/) version 18 or newer
- npm (comes with Node.js) or pnpm
- A modern web browser (Chrome, Edge, Firefox, or a phone browser)
- Git (optional, for cloning)

Check your versions:

```bash
node -v
npm -v
```

## How to Run

1. **Get the project**

   ```bash
   git clone <your-repository-url>
   cd MCTED_System
   ```

   Or download the ZIP, extract it, and open the `MCTED_System` folder in VS Code.

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure the environment**

   Copy `.env.example` to `.env` and set the SMTP host, user, password, and sender
   for your email provider. Email verification will not send until valid SMTP
   credentials are configured. The application currently stores records as JSON;
   set `DB_DATA_DIR` only if you want to change the data directory.

4. **Set up the data** (first time only, creates sample tools and the admin account)

   ```bash
   node db/seed.js
   ```

5. **Start the server**

   ```bash
   node server.js
   ```

6. **Open the system** in your browser:

   ```
   http://localhost:3000
   ```

To stop the server, press `Ctrl + C` in the terminal.

## Default Accounts

| Role | Email | Password |
|---|---|---|
| Administrator | admin@basco.gov.ph | *(set in db/seed.js)* |

> Change all default passwords before using the system with real residents.

## Using the System on a Phone (same Wi-Fi)

1. Find the computer's local IP address (`ipconfig` on Windows, look for IPv4, e.g. `192.168.1.10`).
2. On the phone, connected to the same Wi-Fi, open `http://192.168.1.10:3000`.
3. If it does not load, allow Node.js through the Windows Firewall.

## Tailwind CSS

Existing site styling stays in `public/css/style.css`; Tailwind utilities are
built separately with preflight disabled to preserve the existing design.
Rebuild the utility stylesheet after changing Tailwind classes:

```bash
npm run build:css
```

Type-check the frontend API client and backend payment controller with:

```bash
npm run typecheck
```

## Running Tests

```bash
npm test
```

## Project Structure

```text
MCTED_System/
├── db/
│   ├── data/            # JSON data files (users, tools, reservations, ...)
│   ├── database.js      # Reads and writes the JSON files
│   ├── schema.sql       # Reference schema for the data model
│   └── seed.js          # Creates starting data
├── public/
│   ├── css/
│   ├── images/
│   ├── js/
│   ├── uploads/         # Uploaded profile pictures and photos
│   ├── index.html
│   └── receipt-print.html
├── server/
│   ├── config/
│   ├── controllers/     # Request handling
│   ├── middleware/      # Login and role checks
│   ├── repositories/    # Data access
│   └── routes/          # API routes
├── tests/
├── types/               # Shared TypeScript contracts for API boundaries
├── server.js            # Entry point
├── package.json
└── README.md
```

## Data and Backup

- All records are stored in `db/data/`.
- **Back up this folder regularly** (copy it to a USB drive or cloud storage).
- Do not commit real resident data to Git. Keep `db/data/` listed in `.gitignore`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Port 3000 is already in use` | Close the other program, or change the port in `server/config/` |
| `Cannot find module` | Run `npm install` again |
| Page shows no data | Run `node db/seed.js` |
| Phone cannot connect | Check same Wi-Fi, and allow Node.js in the firewall |

## Credits

Developed for SIA 302 for the Municipality of Basco, Batanes.
