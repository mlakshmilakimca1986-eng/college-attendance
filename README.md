# College Attendance System

A modern, dynamic, and professional college attendance management system built with React, Node.js, and TiDB.

## Features
- **Dynamic Auth Page**: Slide show of college visuals with a stunning glassmorphism login/register form.
- **Role-Based Access**: Separate dashboards for Admin and Principals.
- **Admin Approval Workflow**: Approve new campus registrations and send professional WhatsApp notification links.
- **Smart Attendance Entry**: Grid-based entry system for Principals with real-time calculations.
- **Modern UI**: Built with Lucide icons, Framer Motion animations, and a premium dark-themed design system.

## Setup Instructions

### 1. Database (TiDB)
1. Create a cluster on [TiDB Cloud](https://pingcap.com/products/tidb-cloud).
2. Use the provided `server/schema.sql` to initialize your tables.
3. Copy your connection details into `server/.env`.

### 2. Backend (Render)
1. Push the `server` folder to a GitHub repo.
2. Connect to [Render](https://render.com) and create a new **Web Service**.
3. Set the `Environment Variables` in Render matching your `.env` file.

### 3. Frontend (Firebase)
1. Run `npm run build` in the `client` folder.
2. Install Firebase CLI: `npm install -g firebase-tools`.
3. Run `firebase init hosting`.
4. Run `firebase deploy`.

### 4. Local Development
1. **Server**: `cd server && node index.js`
2. **Client**: `cd client && npm run dev`

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS (for layout utilities), Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, JWT, Bcrypt.
- **Database**: TiDB (MySQL compatible).
- **Hosting**: Firebase (Frontend), Render (Backend).
