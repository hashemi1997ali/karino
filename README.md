# ✅ Karino

A full-stack task-management platform built with **Next.js, Express, TypeScript, MongoDB, and configurable AI providers**.

Karino combines personal task planning, secure account management, role-based administration, and persistent support chat in one bilingual web application.

---

## 📖 Project Overview

Karino gives users a private workspace for creating, organizing, filtering, and completing tasks. Administrators can manage users and support conversations, while the built-in assistant provides contextual help and can transfer conversations to human staff when needed.

The repository is an npm workspace containing the web client and API:

```text
task-manager/
├── client/   # Next.js application
├── server/   # Express REST API
├── package.json
└── README.md
```

---

## ✨ Features

### 📋 Task Management

- Create, edit, delete, search, filter, sort, and paginate tasks
- Track `todo`, `in-progress`, and `done` statuses
- Assign low, medium, or high priority
- Set deadlines and view overdue-task statistics
- Upload JPG, PNG, or WEBP profile images through Cloudinary
- View personal and administrative dashboards

### 🔐 Authentication and Security

- Registration, login, logout, and password reset
- Short-lived JWT access tokens held in memory
- Rotating refresh tokens stored in HTTP-only cookies
- Refresh-token reuse detection and session-family revocation
- Active-device and session management
- Request validation with Zod and centralized error handling
- Dedicated rate limits for authentication and chat routes

### 👥 Roles and Administration

- `user`: manages personal tasks, profile, sessions, and chat history
- `admin`: manages regular users, tasks, bans, and support requests
- `super_admin`: manages administrators and escalated support requests
- Immediate session revocation after bans, deletion, or role changes
- Configurable initial super administrator

### 💬 Assistant and Support Chat

- Guest and authenticated conversations
- Persistent chat history for signed-in users
- English and German responses
- Human-support escalation, claiming, transfer, rating, and closure
- Context-aware reply suggestions for administrators
- Draft rewriting that improves a staff message without answering it
- OpenAI, OpenRouter, Anthropic, Gemini, and Ollama provider support

### ✉️ Contact and Email

- Public contact form
- Administrative inbox with stored reply history
- Password-reset and contact-reply email through Brevo
- Configurable public contact and social information

---

## 🛠️ Technology Stack

### Client

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form and Zod
- Radix UI and Lucide icons

### Server

- Node.js 24 and Express 5
- TypeScript
- MongoDB and Mongoose
- JWT and bcrypt
- Zod
- Multer and Cloudinary
- Brevo transactional email

---

## 🚀 Getting Started

### Prerequisites

- Node.js `24` or later
- npm
- MongoDB locally or through MongoDB Atlas
- An AI provider, or a local Ollama installation
- A Brevo account for transactional email
- A Cloudinary account for profile image uploads

### Installation

```bash
git clone <repository-url>
cd task-manager
npm install
```

Create local environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

At minimum, configure the database and authentication secrets in `server/.env`:

```env
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/karino

ACCESS_JWT_SECRET=replace_with_a_long_random_access_secret
REFRESH_JWT_SECRET=replace_with_a_different_long_random_refresh_secret

APP_URL=http://localhost:3000
```

Select one assistant provider. For example, a local Ollama setup can use:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen3:8b
```

The complete configuration, including provider keys, Brevo, Cloudinary, rate limits, retention, and contact details, is documented inline in `server/.env.example`.

### Run the Project

Start the client and API together:

```bash
npm run dev
```

- Web application: `http://localhost:3000`
- REST API: `http://localhost:4000`

The browser sends `/api/*` requests through the Next.js same-origin rewrite. `API_SERVER_URL` in `client/.env.local` controls the internal API destination.

---

## 📜 Available Scripts

| Command                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start the client and server in development mode |
| `npm run dev:client`   | Start only the Next.js client                   |
| `npm run dev:server`   | Start only the Express API                      |
| `npm run typecheck`    | Type-check both workspaces                      |
| `npm run lint`         | Run the client ESLint configuration             |
| `npm run format`       | Format the repository with Prettier             |
| `npm run format:check` | Check formatting without changing files         |
| `npm run build`        | Build the client and server                     |
| `npm run start:client` | Start the production client build               |
| `npm run start:server` | Build and start the production API              |

For production:

```bash
npm run build
```

Then run the client and server in separate processes:

```bash
npm run start:client
npm run start:server
```

---

## 🛣️ Main Routes

### Web Application

| Route            | Access        | Description                          |
| ---------------- | ------------- | ------------------------------------ |
| `/`              | Public        | Landing page                         |
| `/login`         | Public        | Sign in                              |
| `/register`      | Public        | Create an account                    |
| `/contact`       | Public        | Contact form and public information  |
| `/dashboard`     | Authenticated | Task summary                         |
| `/tasks`         | Authenticated | Personal task management             |
| `/account`       | Authenticated | Profile, password, and sessions      |
| `/admin/tasks`   | Staff         | Manage all tasks                     |
| `/admin/users`   | Staff         | Manage users, roles, and bans        |
| `/admin/support` | Staff         | Handle support conversations         |
| `/admin/contact` | Staff         | Review and reply to contact messages |

### API

| Base Path  | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| `/auth`    | Authentication, profile, password, and sessions         |
| `/tasks`   | Personal task CRUD, filters, and summaries |
| `/admin`   | Administrative task and user management                 |
| `/chat`    | Assistant conversations and staff support               |
| `/contact` | Public submissions and staff replies                    |

Protected API requests use:

```http
Authorization: Bearer ACCESS_TOKEN
```

Successful responses generally follow:

```json
{
  "success": true,
  "data": {}
}
```

Errors generally follow:

```json
{
  "success": false,
  "message": "Request failed"
}
```

---

## 👑 Initial Super Administrator

Register the account normally, then set its email in `server/.env`:

```env
SUPER_ADMIN_EMAIL=owner@example.com
```

The matching account is promoted when the server starts. Additional role changes are available from the admin interface.

---

## 📌 Production Notes

- Use long, random, and different access and refresh JWT secrets.
- Set `NODE_ENV=production` to enable secure refresh cookies.
- Configure `TRUST_PROXY_HOPS` for the exact number of trusted proxies.
- Use a shared rate-limit store such as Redis when running multiple API instances.
- Verify the Brevo sender address before enabling transactional email.
- Never commit `.env`, API keys, Cloudinary secrets, or database credentials.
- Configure HTTPS and a production MongoDB deployment before exposing the application publicly.
