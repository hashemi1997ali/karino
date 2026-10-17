# ✅ Karino

A responsive full-stack productivity platform built with **Next.js, Express, TypeScript, MongoDB, and configurable AI providers**.

Karino combines personal task planning, a private AI assistant, secure account management, role-based administration, contact workflows, and persistent support chat in one bilingual web application.

---

## 📖 Project Overview

Karino gives users a private, responsive workspace for planning their day and managing tasks through adaptive card layouts on smaller screens and a structured table on wide screens. Administrators get an operational overview plus tools for users, tasks, support, and contact messages. Built-in assistants provide role-scoped site guidance, private task planning, confirmed task creation, and staff account tools.

The repository is an npm workspace containing the web client and API:

```text
karino/
├── client/   # Next.js application
├── server/   # Express REST API
├── package-lock.json
├── package.json
└── README.md
```

---

## ✨ Features

### 📋 Task Management

- Create, edit, delete, search, filter, sort, and paginate tasks
- Filter by status, priority, and overdue state; sorting by due date keeps tasks without a deadline last
- Review and update tasks through responsive cards on mobile and tablet, with a structured table on wide screens
- Track `todo`, `in-progress`, and `done` statuses
- Assign low, medium, or high priority
- Set deadlines, identify overdue work, and review recently updated tasks
- Use a focused Today dashboard with overall completion, priorities, overdue work, and a seven-day upcoming schedule

### 🎨 Workspace Experience

- Responsive desktop sidebar, tablet navigation rail, and mobile bottom navigation
- Mobile and tablet cards for tasks and users, with dense tables on wide screens
- Light, dark, and system themes with persisted appearance preferences
- English and German interface copy with locale-aware dates and numbers
- Accessible focus states, semantic controls, reduced-motion support, and reusable loading, error, and empty states

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
- Administrative overview with user, task, and support metrics
- Responsive user and task management with role, status, and ownership context
- Immediate session revocation after bans, deletion, or role changes
- Configurable initial super administrator

### 💬 Assistant and Support Chat

- Guest site guidance with account requests directed to the public contact form
- Private task-assistant conversations stored separately from support and visible only to their owner
- Friendly task planning, prioritization, and task drafts that require confirmation before creation
- Persistent assistant history with conversation-aware task context
- Role-scoped site guidance that never exposes staff features
- Staff account tools for lookup, ban/unban, and super-admin-only role changes
- English and German responses
- Human-support escalation, claiming, transfer, rating, and closure
- Context-aware reply suggestions for administrators
- Draft rewriting that improves a staff message without answering it
- Works with any OpenAI-compatible provider (Groq, OpenRouter, OpenAI, Gemini, Ollama) through three settings

### ✉️ Contact and Email

- Public contact form
- Responsive administrative inbox with stored reply history
- Password-reset and contact-reply email through Brevo
- Configurable public contact and social information
- JPG, PNG, and WEBP profile-image uploads through Cloudinary

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
- Optional: an AI provider or a local Ollama installation
- Optional: a Brevo account for transactional email
- Optional: a Cloudinary account for profile-image uploads

### Installation

```bash
git clone https://github.com/hashemi1997ali/karino.git
cd karino
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

The assistant works with any OpenAI-compatible API (Groq, OpenRouter, OpenAI, Gemini, a local Ollama, …). Set the provider's address, key, and model:

```env
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=your_groq_key
AI_MODEL=openai/gpt-oss-120b
```

For Ollama use `AI_BASE_URL=http://127.0.0.1:11434/v1` and leave `AI_API_KEY` empty. Choose a model that supports tool calling so the assistant can prepare task drafts.

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

| Command                           | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `npm run dev`                     | Start the client and server in development mode |
| `npm run dev:client`              | Start only the Next.js client                   |
| `npm run dev:server`              | Start only the Express API                      |
| `npm run typecheck`               | Type-check both workspaces                      |
| `npm test`                        | Run the API unit and integration tests          |
| `npm run seed --workspace server` | Load demo users, tasks, chats and messages      |
| `npm run lint`                    | Run the client ESLint configuration             |
| `npm run format`                  | Format the repository with Prettier             |
| `npm run format:check`            | Check formatting without changing files         |
| `npm run build`                   | Build the client and server                     |
| `npm run start:client`            | Start the production client build               |
| `npm run start:server`            | Build and start the production API              |

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

## 🎭 Demo Data

Fill a development database with realistic demo content:

```bash
npm run seed --workspace server
```

It creates ten accounts (three admins and no super admin; that stays the account set in `SUPER_ADMIN_EMAIL`), tasks across every status and due date, support chats in every state (waiting, active, ended and rated, guest, admin escalation), answered and open contact messages, and assistant conversations with task drafts. All demo addresses end in `@example.com`; running the command again replaces only that data, and it only runs when `ALLOW_DEMO_SEED=true` is set (add it to your local `server/.env`, never to a deployed one) and never with `NODE_ENV=production`.

Every demo account uses the password `KarinoDemo1`:

| Role   | Email                                                                              |
| ------ | ---------------------------------------------------------------------------------- |
| Admin  | `olivia.bennett@example.com`, `sarah.klein@example.com`, `marco.rossi@example.com` |
| User   | `james.carter@example.com`, `lena.wagner@example.com` (German) and more            |
| Banned | `mia.schneider@example.com`                                                        |

---

## 🧪 Testing

```bash
npm test
```

The API suite uses Node's built-in test runner and needs no running database:

- **Integration tests** (`server/test/api.test.ts`) run the real Express app against an in-memory MongoDB: refresh-token rotation and reuse detection, immediate session revocation on logout and ban, per-user task isolation, staff command confirmation, and email-change protection.
- **Unit tests** cover JWT verification, the authentication middleware, the role hierarchy, request validation, and the AI guardrails and routing.

GitHub Actions runs type checking, linting, and the tests on every push and pull request.

---

## 🛣️ Main Routes

### Web Application

| Route               | Access        | Description                                  |
| ------------------- | ------------- | -------------------------------------------- |
| `/`                 | Public        | Landing page                                 |
| `/login`            | Public        | Sign in                                      |
| `/register`         | Public        | Create an account                            |
| `/forgot-password`  | Public        | Request a password-reset link                |
| `/reset-password`   | Public        | Set a new password                           |
| `/contact`          | Public        | Contact form and public information          |
| `/dashboard`        | Authenticated | Today overview, focus work, and progress     |
| `/tasks`            | Authenticated | Personal task management in card/table views |
| `/assistant`        | Authenticated | Private AI task assistant and history        |
| `/account`          | Authenticated | Profile, appearance, security, and sessions  |
| `/admin`            | Staff         | Administrative overview and metrics          |
| `/admin/tasks`      | Staff         | Manage all tasks and owners                  |
| `/admin/users`      | Staff         | Manage users, roles, and bans                |
| `/admin/users/[id]` | Staff         | Review a user, their tasks, and access       |
| `/admin/support`    | Staff         | Handle and transfer support conversations    |
| `/admin/contact`    | Staff         | Review and reply to public contact messages  |

### API

| Base Path    | Purpose                                                          |
| ------------ | ---------------------------------------------------------------- |
| `/auth`      | Authentication, profile, password, and sessions                  |
| `/tasks`     | Personal task CRUD, filters, and summaries                       |
| `/admin`     | Administrative task and user management                          |
| `/assistant` | Private task-assistant conversations and confirmed task creation |
| `/chat`      | Site guidance and staff support conversations                    |
| `/contact`   | Public submissions and staff replies                             |

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
