# 🧰 TaskPro – Backend (Node.js / Express / MongoDB)

[![Node](https://img.shields.io/badge/Node-%3E=16-339933.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000.svg)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg)](https://mongoosejs.com)
[![Swagger](https://img.shields.io/badge/Docs-Swagger-85EA2D.svg)](https://swagger.io)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7.svg)](https://render.com)

TaskPro Backend provides a REST API for the **TaskPro** Kanban app.  
It handles authentication, user profiles, board/column/card CRUD, theming, image upload, and support emails.

---

## 🔗 Live API

- Base URL: `https://taskpro-backend-lybk.onrender.com`
- Swagger UI: `https://taskpro-backend-lybk.onrender.com/api-docs` _(if enabled)_
- Frontend: [`TaskPro-Frontend`](https://github.com/Abiatar-Cosma/TaskPro-Frontend)

---

## ✨ Features

- 🔐 JWT authentication & authorization (access + refresh tokens)
- 🧩 CRUD for Boards, Columns, and Cards (Kanban)
- 🎨 Per-user theme: Light / Violet / Dark
- ☁️ Image upload (Cloudinary)
- 📧 Support form (“Need Help”) via Nodemailer
- 📚 API documentation with Swagger
- 🧪 Jest + Supertest + MongoDB-memory-server for testing
- 🛡️ Helmet, CORS, and validation middleware for security

---

## 🧱 Tech Stack

**Core:** Node.js, Express, MongoDB, Mongoose  
**Auth:** bcryptjs, jsonwebtoken, passport-jwt, express-validator  
**Docs:** swagger-ui-express, swagger-jsdoc  
**Uploads:** multer, multer-storage-cloudinary, cloudinary  
**Mail:** nodemailer  
**Utils:** dotenv, morgan, helmet, cors, express-async-handler  
**Tests:** jest, supertest, mongodb-memory-server

---

## 🚀 Getting Started

### 1️⃣ Clone & install

```bash
git clone https://github.com/Abiatar-Cosma/TaskPro-Backend.git
cd TaskPro-Backend
npm install
```
