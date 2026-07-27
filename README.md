# Proforma Invoice Generator (ProfomaMaker)

> A modern, full-stack, bilingual (English & Arabic) Proforma Invoice Management System designed for hotels, resorts, banquets, and event spaces.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Node](https://img.shields.io/badge/Node.js-Express-green)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)

---

## ✨ Features

- **🏨 Multi-Category Invoicing**: Support for Room Stay, Event / Banquet Hall Rental, and Miscellaneous services.
- **🌐 Bilingual Support**: Dual English & Arabic proforma invoice generator with a live **Language Switcher** (Bilingual, English Only, or Arabic Only with RTL layout).
- **🖨️ A4 PDF Print & Isolation**: Print or export clean A4 proforma invoices without UI clutter.
- **🏷️ Line Item Presets**: Pre-define room rates, banquet packages, and extra service items with default prices.
- **👥 Customer Management**: Store customer profiles, stacked addresses, and 15-digit ZATCA VAT numbers with **Bulk CSV Import & Export**.
- **📊 Invoice History & Reporting**: Search, filter by category/date/amount, export filtered CSVs, and generate printable **Proforma Invoice Summary Reports (A4 Landscape)**.
- **🎨 Custom Appearance**: 6 high-contrast AAA color themes (*Original Navy, Minimal Neo-White, Midnight Cyber, Desert Sunset, Emerald Tech, Slate Pro*) and 6 professional UI font options (*Inter, Roboto, Outfit, Plus Jakarta Sans, Poppins, Montserrat*).
- **🔒 Authentication & Security**: JWT-based login with role-based access (`admin` vs `user`) and optional TOTP 2FA.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router 6, TailwindCSS, Progressive Web App (PWA).
- **Backend**: Node.js, Express.js, PostgreSQL (`pg`), JWT, Bcrypt, Helmet, Rate Limiter.
- **Database**: PostgreSQL (auto-migrated and seeded on startup).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ProfomaMaker.git
   cd ProfomaMaker
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your PostgreSQL database credentials:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/profomamaker
   JWT_SECRET=your_super_secret_jwt_key
   NODE_ENV=development
   ```

3. **Install Dependencies**:
   ```bash
   npm run postinstall
   ```

4. **Run Database Migrations**:
   ```bash
   npm run migrate --prefix server
   ```

5. **Start Development Servers**:
   - Backend Server: `npm start --prefix server`
   - Frontend Client: `npm run dev --prefix client`

Open [http://localhost:5173](http://localhost:5173) in your browser!

---

## ☁️ Deployment on Render.com

This repository includes full configuration for seamless deployment on **Render.com**.

### Option A: Automatic Blueprint Deployment (Recommended)
1. Push this repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New > Blueprint**.
3. Select your GitHub repository. Render will automatically detect `render.yaml` and provision both:
   - A Node.js Web Service
   - A PostgreSQL Database
4. Render will build and start your application automatically!

### Option B: Manual Web Service Setup on Render
1. Create a **Web Service** on Render connected to your repository.
2. Set Environment: **Node**
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your PostgreSQL connection string)*
   - `JWT_SECRET`: *(A random 64-character secret string)*

---

## 📄 License
MIT License. Free for commercial and personal use.
