# Task Manager API

REST API for the Task Manager platform, built with Express 5, TypeScript, MongoDB/Mongoose, Zod, JWT, bcrypt, cookies, Multer, and optional Cloudinary uploads.

## Features

- Registration, login, token refresh, logout, and profile management
- Short-lived access tokens and database-backed refresh sessions with rotation
- Active-session management and refresh-token replay detection
- Personal task CRUD, filtering, search, pagination, summaries, and optional attachments
- `user`, `admin`, and `super_admin` roles
- User bans with a predefined reason, timestamp, captured active-session IP addresses, and immediate session revocation
- AI assistant for guests and authenticated users
- Persistent chat history, human-support queues, transfers, ratings, and AI reply suggestions
- Centralized validation, error handling, and rate limiting

## Requirements

- Node.js `24` or later
- npm
- MongoDB locally or through MongoDB Atlas
- Cloudinary only when file attachments are required

## Setup

From the monorepo root:

```bash
npm install
cp server/.env.example server/.env
npm run dev:server
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
npm run dev:server
```

With the example configuration, the API is available at `http://localhost:4000`.

## Environment Variables

See `server/.env.example` for the complete list.

| Variable                      | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `PORT`                        | Express port                                                    |
| `MONGO_URI`                   | MongoDB connection URI                                          |
| `ACCESS_JWT_SECRET`           | Secret used to sign access tokens                               |
| `REFRESH_JWT_SECRET`          | Separate secret used to sign refresh tokens                     |
| `ACCESS_TOKEN_TTL`            | Access-token lifetime in seconds                                |
| `REFRESH_TOKEN_TTL`           | Absolute refresh-session lifetime in seconds                    |
| `JWT_ISSUER`                  | JWT issuer                                                      |
| `TRUST_PROXY_HOPS`            | Exact number of trusted proxy hops                              |
| `SUPER_ADMIN_EMAIL`           | Existing account promoted to the initial super admin on startup |
| `AI_PROVIDER`                 | `openrouter`, `openai`, `anthropic`, `gemini`, or `ollama`      |
| `OPENROUTER_API_KEY`          | OpenRouter API key                                              |
| `OPENROUTER_MODEL`            | OpenRouter model identifier                                     |
| `OPENAI_API_KEY`              | OpenAI API key                                                  |
| `OPENAI_MODEL`                | OpenAI model identifier                                         |
| `ANTHROPIC_API_KEY`           | Anthropic API key                                               |
| `ANTHROPIC_MODEL`             | Anthropic model identifier                                      |
| `GEMINI_API_KEY`              | Gemini API key                                                  |
| `GEMINI_MODEL`                | Gemini model identifier                                         |
| `OLLAMA_BASE_URL`             | Ollama server URL                                               |
| `OLLAMA_MODEL`                | Local Ollama model                                              |
| `AI_TIMEOUT_MS`               | AI request timeout in milliseconds                              |
| `SUPPORT_CHAT_RETENTION_DAYS` | Number of days ended chats remain in MongoDB                    |
| `CLOUDINARY_*`                | Optional attachment-upload settings                             |
| `AUTH_*`                      | Authentication rate-limit settings                              |
| `CHAT_*`                      | Assistant and suggestion rate-limit settings                    |

Use `TRUST_PROXY_HOPS=0` when Express is directly exposed. Use `1` when Next.js is the only trusted proxy in front of Express. Set the exact number of trusted proxies in other deployments so the client IP cannot be spoofed.

## Response Format

Successful responses generally use:

```json
{
  "success": true,
  "data": {}
}
```

Errors generally use:

```json
{
  "success": false,
  "message": "Validation failed",
  "issues": []
}
```

Protected routes require:

```text
Authorization: Bearer ACCESS_TOKEN
```

The refresh token is sent through an `HttpOnly` cookie named `refreshToken`.

## Authentication

Base path: `/auth`

| Method   | Route                       | Access                  | Description                                            |
| -------- | --------------------------- | ----------------------- | ------------------------------------------------------ |
| `POST`   | `/auth/register`            | Public                  | Create an account and session                          |
| `POST`   | `/auth/login`               | Public                  | Sign in and create an independent session              |
| `POST`   | `/auth/refresh`             | Refresh cookie          | Rotate the refresh token and return a new access token |
| `POST`   | `/auth/logout`              | Optional refresh cookie | Revoke the current session and clear the cookie        |
| `GET`    | `/auth/me`                  | Authenticated           | Return the current user                                |
| `PATCH`  | `/auth/me`                  | Authenticated           | Update first name, last name, or email                 |
| `PATCH`  | `/auth/me/password`         | Authenticated           | Change the password and revoke other sessions          |
| `GET`    | `/auth/sessions`            | Authenticated           | List active sessions                                   |
| `DELETE` | `/auth/sessions/others`     | Authenticated           | Revoke all sessions except the current one             |
| `DELETE` | `/auth/sessions/:sessionId` | Authenticated           | Revoke one owned session                               |
| `DELETE` | `/auth/sessions`            | Authenticated           | Revoke all sessions                                    |

Each login creates a separate refresh-session document. Only a SHA-256 hash of the refresh token identifier is stored. Every successful refresh rotates that identifier. Reusing an old refresh token revokes the related session with the reason `reuse-detected`.

All protected routes verify the access-token signature, the active refresh session, and the current user document. Revoking a session therefore invalidates access immediately rather than waiting for the access token to expire.

## Roles and Permissions

The application has three roles:

- `user`: manages only their own account, sessions, tasks, and chat history
- `admin`: manages regular users, regular-user bans, all tasks, and regular-user support cases
- `super_admin`: has all staff permissions and may additionally promote or demote admins, manage admin accounts, and handle escalated admin support cases

Only a super admin can grant or remove the admin role. An admin cannot manage another admin or a super admin. A super admin cannot be banned or demoted through the application.

To create the first super admin, register the account normally and set:

```dotenv
SUPER_ADMIN_EMAIL=owner@example.com
```

The matching existing account is promoted on the next server startup.

## Bans

Admins can ban and unban regular users. Super admins can also ban and unban admins.

Allowed reasons:

- `spam`
- `abusive-behavior`
- `harassment`
- `fraud`
- `terms-violation`
- `security`
- `other`

When a user is banned, the user document stores:

- `ban.isBanned`
- `ban.reason`
- `ban.bannedAt`
- `ban.sessionIps`

All active sessions are then revoked. Login, refresh, and matching registration attempts return `403` with the ban reason and date. Unbanning clears the complete `ban` object.

## Tasks

Base path: `/tasks`

All task routes require an authenticated active session. Regular users can access only their own tasks.

| Method   | Route                   | Description                                       |
| -------- | ----------------------- | ------------------------------------------------- |
| `GET`    | `/tasks`                | List personal tasks with filtering and pagination |
| `GET`    | `/tasks/summary`        | Return personal task statistics                   |
| `GET`    | `/tasks/:id`            | Return one personal task                          |
| `POST`   | `/tasks`                | Create a task                                     |
| `PATCH`  | `/tasks/:id`            | Update a task or replace its attachment           |
| `DELETE` | `/tasks/:id`            | Delete a task                                     |
| `DELETE` | `/tasks/:id/attachment` | Remove the attachment only                        |

Task fields:

| Field         | Description                                        |
| ------------- | -------------------------------------------------- |
| `title`       | Required when creating; 3 to 100 characters        |
| `description` | Optional; up to 2,000 characters                   |
| `status`      | `todo`, `in-progress`, or `done`                   |
| `priority`    | `low`, `medium`, or `high`                         |
| `dueDate`     | Optional ISO 8601 date-time with a timezone offset |
| `completedAt` | Managed by the server                              |
| `attachment`  | Optional file using the form field `attachment`    |

Allowed attachment types are JPG, PNG, WEBP, PDF, and TXT. The maximum file size is 5 MB.

Common `GET /tasks` query parameters:

- `status`
- `priority`
- `search`
- `dueBefore`
- `dueAfter`
- `page`
- `limit`
- `sortBy`
- `order`

## Administration

Base path: `/admin`

Every admin route requires a valid access token, an active refresh session, and a freshly loaded `admin` or `super_admin` role from MongoDB.

### All Tasks

| Method   | Route                         | Description                                  |
| -------- | ----------------------------- | -------------------------------------------- |
| `GET`    | `/admin/tasks`                | List all tasks, optionally filtered by owner |
| `GET`    | `/admin/tasks/:id`            | Return any task                              |
| `PATCH`  | `/admin/tasks/:id`            | Update any task or replace its attachment    |
| `DELETE` | `/admin/tasks/:id`            | Delete any task                              |
| `DELETE` | `/admin/tasks/:id/attachment` | Remove a task attachment                     |

`GET /admin/tasks` supports `ownerId`, `search`, `status`, `priority`, `page`, `limit`, `sortBy`, and `order`.

### Users

| Method   | Route                         | Description                                       |
| -------- | ----------------------------- | ------------------------------------------------- |
| `GET`    | `/admin/users`                | List users with role and ban filters              |
| `GET`    | `/admin/users/:id`            | Return a user with task and active-session counts |
| `PATCH`  | `/admin/users/:id`            | Update a manageable user                          |
| `PATCH`  | `/admin/users/:id/admin-role` | Grant or remove admin access; super admin only    |
| `POST`   | `/admin/users/:id/ban`        | Ban a manageable account                          |
| `POST`   | `/admin/users/:id/unban`      | Remove a ban and clear ban metadata               |
| `DELETE` | `/admin/users/:id`            | Delete a manageable user and related data         |

## AI and Support Chat

Base path: `/chat`

The guest assistant is not stored. Authenticated chats are stored in MongoDB. Ended chats receive an expiration date and are removed by MongoDB's TTL monitor after `SUPPORT_CHAT_RETENTION_DAYS`.

The chat locale is stored as `en` or `de`. AI responses, command replies, system messages, and suggested support replies use the relevant chat language.

| Method | Route                         | Access         | Description                                     |
| ------ | ----------------------------- | -------------- | ----------------------------------------------- |
| `POST` | `/chat/guest`                 | Public         | Ask the AI assistant without database history   |
| `GET`  | `/chat`                       | Authenticated  | List the current user's latest chats            |
| `POST` | `/chat`                       | Authenticated  | Start a persistent AI chat                      |
| `GET`  | `/chat/:id`                   | Chat owner     | Return one chat                                 |
| `POST` | `/chat/:id/messages`          | Chat owner     | Send a message to AI or assigned staff          |
| `POST` | `/chat/:id/escalate`          | Chat owner     | Send the conversation to human support          |
| `POST` | `/chat/:id/end`               | Chat owner     | End the chat                                    |
| `POST` | `/chat/:id/rating`            | Chat owner     | Save a score from 1 to 5 and an optional reason |
| `GET`  | `/chat/staff/queue`           | Staff          | List open and active support chats              |
| `POST` | `/chat/staff/:id/claim`       | Eligible staff | Atomically accept a chat                        |
| `POST` | `/chat/staff/:id/messages`    | Assigned staff | Send a human reply                              |
| `POST` | `/chat/staff/:id/transfer`    | Assigned admin | Transfer a case to a super admin                |
| `POST` | `/chat/staff/:id/end`         | Assigned staff | End a support chat                              |
| `GET`  | `/chat/staff/:id/suggestions` | Eligible staff | Generate suggested replies in the chat language |

Staff account actions are executed only when a message begins with an explicit command:

```text
/ban user@example.com terms-violation
/unban user@example.com
/user user@example.com
/promote user@example.com
/demote user@example.com
```

`/promote` and `/demote` are available only to super admins. Normal sentences never trigger account changes.

## Rate Limiting

Authentication, guest chat, authenticated chat, and suggestion generation have separate rate limits. The default limiter uses in-memory storage and is suitable for a single process. Use a shared store such as Redis when deploying multiple application instances.

## Validation and Build

From the monorepo root:

```bash
npm run format:check
npm run typecheck
npm run lint
npm run build
```

The server build output is written to `server/dist`.
