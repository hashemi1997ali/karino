# Task Manager Platform

A full-stack task management platform with English as the default interface language, support for switching to German, and a left-to-right layout. The repository is organized as a monorepo using npm workspaces and contains two independent applications:

```text
task-manager-platform/
├── client/   # Next.js App Router, React, and Tailwind CSS
├── server/   # Express, TypeScript, MongoDB/Mongoose, and Zod
├── package.json
└── package-lock.json
```

## Main Features

- Public landing page, registration, and login
- Public contact page with configurable social links and a staff email-reply inbox
- Password-reset and contact-reply emails through the official Brevo Node.js SDK
- English user interface by default, with the option to switch to German
- Light, dark, and system themes; the default is `system`, and changes to the operating system theme are detected and applied in real time
- Persistence of the selected language and theme for future visits
- Dashboard, personal task management, and account management
- Create and edit tasks in a modal, with filtering, search, pagination, and file attachments
- Change first name, last name, email address, and password
- View active devices and sessions, and log out from the current session, other sessions, or all sessions
- Admin panel for viewing and managing all tasks and users
- Add or remove the admin role while invalidating the user’s existing sessions
- Refresh token rotation, refresh token reuse detection, and rate limiting

## Requirements

- Node.js version `24` or later
- npm
- A local MongoDB instance or MongoDB Atlas
- A Cloudinary account only if file attachment uploads are required
- A Brevo account and verified transactional sender for password-reset and contact-reply emails

## Installation and Development

Install the dependencies for both workspaces from the repository root:

```bash
npm install
```

Create the environment files:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

On Linux/macOS:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

At minimum, configure the following values in `server/.env`:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/task-manager-api
ACCESS_JWT_SECRET=replace_with_a_long_random_access_secret
REFRESH_JWT_SECRET=replace_with_a_different_long_random_refresh_secret
BREVO_API_KEY=replace_with_your_brevo_api_key
BREVO_SENDER_EMAIL=verified-sender@example.com
BREVO_SENDER_NAME=Karino
APP_URL=http://localhost:3000
```

Then start both applications simultaneously:

```bash
npm run dev
```

- Client: `http://localhost:3000`
- API: `http://localhost:4000`

The client rewrites `/api/*` requests to the address specified by `API_SERVER_URL`. Its default value is `http://127.0.0.1:4000`. As a result, the browser communicates through a single origin, and the refresh cookie is sent through the same path.

## Root Scripts

| Command                | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start the server and client simultaneously     |
| `npm run dev:server`   | Start the API in watch mode                    |
| `npm run dev:client`   | Start Next.js in development mode              |
| `npm run typecheck`    | Run TypeScript checks for both workspaces      |
| `npm run lint`         | Run ESLint for the client                      |
| `npm run format`       | Format files with Prettier                     |
| `npm run format:check` | Check whether file formatting is consistent    |
| `npm run build`        | Create production builds for server and client |
| `npm run start:server` | Build and start the production API             |
| `npm run start:client` | Start the production Next.js build             |

To run the production version, first create the builds and then start the server and client in two separate terminals or processes:

```bash
npm run build
```

First terminal:

```bash
npm run start:server
```

Second terminal:

```bash
npm run start:client
```

## Environment Variables

### Server

The complete list of environment variables is available in `server/.env.example`. The most important variables are:

| Variable             | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| `PORT`               | Express port; set to `4000` in the example file                    |
| `MONGO_URI`          | MongoDB connection URI                                             |
| `ACCESS_JWT_SECRET`  | Secret used to sign access tokens                                  |
| `REFRESH_JWT_SECRET` | Separate secret used to sign refresh tokens                        |
| `ACCESS_TOKEN_TTL`   | Access token lifetime in seconds; defaults to `900`                |
| `REFRESH_TOKEN_TTL`  | Absolute refresh session lifetime in seconds; defaults to `604800` |
| `JWT_ISSUER`         | JWT issuer                                                         |
| `TRUST_PROXY_HOPS`   | Exact number of trusted proxy hops                                 |
| `AUTH_*`             | Rate limit windows and limits for authentication routes            |
| `CLOUDINARY_*`       | Optional configuration for file uploads                            |
| `SUPER_ADMIN_EMAIL`  | Existing account promoted to the initial `super_admin` on startup  |
| `AI_PROVIDER` / keys | AI provider and provider-specific model/API key settings           |
| `SUPPORT_CHAT_*`     | Chat retention configuration                                       |
| `CHAT_*`             | Chat and AI-suggestion rate limits                                 |
| `BREVO_API_KEY`      | Brevo API key used by the official `@getbrevo/brevo` SDK           |
| `BREVO_SENDER_EMAIL` | Transactional sender registered and verified in Brevo              |
| `BREVO_SENDER_NAME`  | Display name used for outgoing transactional emails                |
| `APP_URL`            | Public client URL used to build password-reset links               |
| `CONTACT_*`          | Contact details, social links, reply text, and contact rate limits |

### Client

| Variable         | Description                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `API_SERVER_URL` | Internal API address used by the Next.js rewrite; this is server-only and must not use the `NEXT_PUBLIC_` prefix |

### Transactional Email

Password-reset links and staff replies to contact submissions are sent with the official `@getbrevo/brevo` SDK. `BREVO_SENDER_EMAIL` must exactly match a sender registered and verified in the same Brevo account as `BREVO_API_KEY`. Restart the API after changing any email-related environment variable. Provider errors are recorded in the server log; the forgot-password endpoint deliberately returns a generic response whether or not an account exists.

## Authentication Architecture

After registration or login, the API generates two credentials:

1. The `accessToken` is returned in the JSON response and is stored only in client memory. It is therefore not stored in `localStorage` or in a cookie that can be accessed through JavaScript.
2. The `refreshToken` is stored in a cookie using the `HttpOnly` and `SameSite=Lax` options. In production, the cookie also uses the `Secure` option.

The client sends the access token using the following header:

```text
Authorization: Bearer ACCESS_TOKEN
```

After a page reload, the client uses the refresh cookie to request a new access token. Refresh operations use a single-flight mechanism so that two simultaneous requests do not consume the same single-use refresh token.

Each login creates a separate document in the refresh sessions collection. Only a hash of the refresh token’s random identifier is stored in the database. Every successful refresh rotates the token. Reusing an old token is detected as a replay attack, and the entire related session family is invalidated. Session expiration is absolute and is not extended by refresh operations.

Access tokens are short-lived and inherently stateless. However, all protected routes verify not only the token signature but also that the session is active and that the user still exists in the database. As a result, logging out, logging out from all devices, deleting a user, or changing a user’s role immediately revokes access for the affected session without waiting for the access token to expire.

## Roles

- `user`: Manage only their own profile, sessions, tasks, and chat history.
- `admin`: Manage regular users, ban or unban regular users, access all tasks, and handle regular-user support conversations.
- `super_admin`: All staff capabilities, plus promotion or demotion of admins, management of admin accounts, and support cases escalated by admins.

All `/admin/*` and staff-support routes re-read the current role from MongoDB. Role changes revoke the affected user’s active refresh sessions. An admin cannot manage another admin or a super admin, and nobody can ban or demote a super admin through the application.

To bootstrap the first super administrator, register the account normally and set its email in `server/.env`:

```dotenv
SUPER_ADMIN_EMAIL=owner@example.com
```

The account is promoted on the next server startup. Further admin promotions and demotions are available only to a super admin.

## User Interface Routes

| Route               | Access               | Description                                             |
| ------------------- | -------------------- | ------------------------------------------------------- |
| `/`                 | Public               | Project landing page                                    |
| `/login`            | Public               | Login                                                   |
| `/register`         | Public               | Create an account                                       |
| `/contact`          | Public               | Contact details, social links, and contact form         |
| `/forgot-password`  | Public               | Request a password-reset email                          |
| `/reset-password`   | Public               | Choose a new password using the emailed token           |
| `/dashboard`        | Authenticated user   | Task overview and statistics                            |
| `/tasks`            | Authenticated user   | List, filter, create, and edit personal tasks           |
| `/account`          | Authenticated user   | Profile, password changes, and session management       |
| `/admin/tasks`      | Admin or super admin | View, filter by owner, edit, and delete all tasks       |
| `/admin/users`      | Admin or super admin | Manage users and bans; role changes require super admin |
| `/admin/users/[id]` | Admin or super admin | View a user profile, statistics, and their tasks        |
| `/admin/support`    | Admin or super admin | Claim, reply to, transfer, and close support chats      |
| `/admin/contact`    | Admin or super admin | Review contact-form submissions and reply by email      |

When a guest selects “View my tasks” or its German equivalent, “Meine Aufgaben ansehen,” they are redirected to the login page. Staff navigation is displayed only for users who have the `admin` or `super_admin` role. A floating assistant is available across the application; guests receive general AI help, while authenticated users also receive persistent history and human-support escalation according to their role.

## API Documentation

A complete list of endpoints, query parameters, request examples, session management behavior, and admin functionality is available in [server/README.md](server/README.md).

## Production Notes

- Use long, random, and different values for the two JWT secrets.
- Set `NODE_ENV=production` so that the refresh cookie is sent only over HTTPS.
- If Next.js is the only proxy in front of Express, `TRUST_PROXY_HOPS=1` is appropriate. For other architectures, specify the actual number of trusted proxy hops.
- The current rate limiter uses in-memory storage. For multiple processes or servers, use a shared store such as Redis.
- Deleting a user and their related data involves multiple separate operations. In production, when using a replica set, these operations should preferably run inside a transaction together with a retryable cleanup strategy for Cloudinary resources.
- Protection against removing the final administrator is active for normal requests. However, guaranteeing this invariant across multiple instances and fully concurrent requests requires a database-level guard or distributed lock.
- `npm audit` reports a moderate warning for the internal PostCSS dependency in Next.js `16.2.10`. Running `audit fix --force` downgrades Next.js to an older, incompatible version. Do not run it. Upgrade Next.js when a stable patched release becomes available.
- Do not commit `.env` files, and keep the Cloudinary secret on the server only.
