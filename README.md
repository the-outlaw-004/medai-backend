# MedAI Backend - Project Setup & Configuration Guide

This document provides all necessary steps to configure, run, and evaluate the MedAI backend project — including environment setup, dependencies, background workers, database configuration, and API workflow.

---

## 🚀 Overview

This backend powers PDF/Image medical report extraction using:

* **Node.js + Express**
* **PostgreSQL** (using `pg` client)
* **Redis** (used by BullMQ for background jobs)
* **BullMQ Workers** for asynchronous report processing
* **OpenAI API** for generating AI summaries
* **pdf-parse** for PDF text extraction
* **Tesseract.js** for image OCR
* **Multer** for file uploads

---

## 📁 Project Structure

```
medai-backend/
│
├── src/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   ├── routes/
│   ├── uploads/          <-- Uploaded files stored here
│   └──services
│       ├── refreshTokenService.js
│       └── userService.js
│
├── db
│   └──migrations
│       └──001_migration.sql
│
├── server.js
│
├── workers/
│   └── reportWorker.js
│   
│
├── .env
├── .env.example
├── package.json
├── README.md
└── ...
```

---

## ⚙️ Requirements

Ensure the following are installed:

### **1. Node.js ≥ 18**

### **2. PostgreSQL ≥ 14**

Used for storing users and reports.

### **3. Redis ≥ 6**

Required for BullMQ queues.

---

## 🛠️ Installation

### Clone the repo

```sh
git clone <repo-url>
cd medai-backend
```

### Install dependencies

```sh
npm install
```

---

## 🔑 Environment Variables

Create a `.env` file in the root directory. You can copy the sample below:

```ini
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/medai
BCRYPT_SALT_ROUNDS=12
JWT_ACCESS_SECRET=your_access_secret
ACCESS_TOKEN_EXPIRES=15m
JWT_REFRESH_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRES=7d
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
USE_MOCK_AI=true
NODE_ENV=development
OPENAI_API_KEY=your_openai_key
```

## 🗄️ Database Setup

Create database manually:

```sql
CREATE DATABASE medai;
```

### **Tables**

Run the below command to create required tables:
### using psql (or use docker exec into container)
psql postgres://user:pass@localhost:5432/medai -f db/migrations/001_create_users.sql


---

## 🏃‍♂️ Running the Project

Follow these steps to start all components:

### 1. Start Infrastructure
*   **PostgreSQL**: Ensure your PostgreSQL server is running.
*   **Redis**: Start the Redis server (e.g., `redis-server`).

### 2. Start Backend Server & Worker
In the root directory, run:
```sh
npm run dev
```
This command starts both the Express server and the BullMQ worker concurrently.

### 3. Start Frontend
*(Note: Frontend is a separate application)*
1.  Navigate to the frontend repository.
2.  Install dependencies: `npm install`
3.  Start the development server: `npm start`

---

## 🔄 Background Worker (BullMQ)

The worker processes uploaded reports (PDF/image) in background.

Worker responsibilities:

* Detect file type (PDF / Image)
* For PDF → extract text via **pdf-parse@1.1.1**
* For images → extract text using **Tesseract.js**
* Generate AI summary via **OpenAI API**
* Update the report record

---

## 📤 Upload Reports API

**POST /report/upload**

* Accepts a file (PDF/image)
* Stores file in `src/uploads/`
* Creates a report entry in DB
* Pushes job to BullMQ queue

### Response Example

```json
{
  "success": true,
  "reportId": 42
}
```

---

## 📥 Fetch All Reports

**GET /reports**
Returns all reports for logged-in user.

---

## 📥 Fetch Single Report

**GET /reports/:id**
Returns:

* file info
* status
* extracted_text
* ai_summary

---

## 🔧 Important Notes

### 1️⃣ pdf-parse version

Workers require:

```
pdf-parse@1.1.1
```

Higher versions break CommonJS usage.

### 2️⃣ Windows path fix

File paths may appear like:

```
src\uploads\file.pdf
```

This is normal for Windows. Processing code handles it.

### 3️⃣ OpenAI API limits

Ensure you set a valid key.

### 4️⃣ Redis must be running

BullMQ won’t work without Redis.

### Start server + worker

```sh
npm run dev
```
---

## 🧪 Testing Instructions

1. Start Postgres and Redis
2. Run migrations/tables
3. Start backend + worker
4. Upload a PDF via Postman
5. Check `reports` table for:

   * status updates
   * extracted_text
   * ai_summary

---

## 📦 Tech Stack Summary

| Component   | Tool                 |
| ----------- | -------------------- |
| Server      | Node.js + Express    |
| DB          | PostgreSQL           |
| Queue       | BullMQ + Redis       |
| OCR         | Tesseract.js         |
| PDF Parsing | pdf-parse@1.1.1      |
| AI Summary  | OpenAI API           |
| Auth        | JWT                  |
| Uploads     | Multer               |

---

## 📄 License

This project is provided for evaluation purposes.

---