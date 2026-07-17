# Task Manager API

REST API پروژه‌ی Task Manager با Express 5، TypeScript، MongoDB/Mongoose، Zod، JWT، bcrypt، cookie، Multer و Cloudinary است.

## قابلیت‌ها

- ثبت‌نام، ورود، refresh، خروج و پروفایل کاربر
- access token کوتاه‌عمر و refresh session دیتابیسی با rotation
- مدیریت sessionهای فعال و تشخیص refresh token replay
- CRUD تسک‌های شخصی، فیلتر، جست‌وجو، صفحه‌بندی و آمار تجمیعی
- فایل پیوست اختیاری با Cloudinary
- مدیریت همه‌ی تسک‌ها و کاربران توسط مدیر
- ویرایش نقش مدیر با بررسی دوباره‌ی نقش از دیتابیس
- Zod validation، error handler مرکزی و rate limiting

## راه‌اندازی

این workspace به Node.js نسخه‌ی `24` یا بالاتر نیاز دارد.

از ریشه‌ی monorepo:

```bash
npm install
```

فایل محیطی را بسازید:

```powershell
Copy-Item server/.env.example server/.env
```

سپس API را اجرا کنید:

```bash
npm run dev:server
```

یا از داخل پوشه‌ی `server`:

```bash
npm run dev
```

با تنظیمات نمونه، API روی `http://localhost:4000` در دسترس است. `GET /` نیز وضعیت اجرای API را برمی‌گرداند.

| Method | Route | توضیح                                                      |
| ------ | ----- | ---------------------------------------------------------- |
| `GET`  | `/`   | health response ساده با پیام `Task Manager API is running` |

## متغیرهای محیطی

```dotenv
NODE_ENV=development
PORT=4000
TRUST_PROXY_HOPS=1

MONGO_URI=mongodb://127.0.0.1:27017/task-manager-api

ACCESS_JWT_SECRET=replace_with_a_long_random_access_secret
REFRESH_JWT_SECRET=replace_with_a_long_random_refresh_secret
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=604800
JWT_ISSUER=task-manager-api

AUTH_REGISTER_RATE_LIMIT=5
AUTH_REGISTER_RATE_WINDOW_MS=3600000
AUTH_LOGIN_RATE_LIMIT=10
AUTH_LOGIN_RATE_WINDOW_MS=900000
AUTH_REFRESH_RATE_LIMIT=30
AUTH_REFRESH_RATE_WINDOW_MS=900000
AUTH_REFRESH_SESSION_RATE_LIMIT=30
AUTH_REFRESH_SESSION_RATE_WINDOW_MS=900000

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`ACCESS_TOKEN_TTL` و `REFRESH_TOKEN_TTL` بر حسب ثانیه و windowهای rate limit بر حسب میلی‌ثانیه‌اند. Cloudinary اختیاری است؛ بدون آن همه‌ی عملیات به‌جز آپلود فایل کار می‌کنند و درخواست آپلود پاسخ `503` می‌گیرد.

در اجرای مستقیم Express مقدار `TRUST_PROXY_HOPS=0` بگذارید. اگر Next.js تنها proxy جلوی API است مقدار `1` مناسب است. مقدار واقعی باید دقیقاً با تعداد proxyهای مورد اعتماد برابر باشد تا IP کاربر قابل جعل نباشد.

## قرارداد عمومی پاسخ

پاسخ موفق معمولاً این شکل را دارد:

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": {}
}
```

پاسخ خطا:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Please provide a valid email address" }]
}
```

برای routeهای محافظت‌شده access token را بفرستید:

```text
Authorization: Bearer ACCESS_TOKEN
```

## Auth API

Base path: `/auth`

| Method   | Route                       | نیازمندی                      | توضیح                                          |
| -------- | --------------------------- | ----------------------------- | ---------------------------------------------- |
| `POST`   | `/auth/register`            | عمومی                         | ساخت حساب، session و tokenها                   |
| `POST`   | `/auth/login`               | عمومی                         | ورود و ساخت session مستقل                      |
| `POST`   | `/auth/refresh`             | refresh cookie                | rotation کوکی و دریافت access token جدید       |
| `POST`   | `/auth/logout`              | refresh cookie اختیاری        | باطل‌کردن session جاری و پاک‌کردن cookie       |
| `GET`    | `/auth/me`                  | access token + active session | دریافت کاربر جاری                              |
| `PATCH`  | `/auth/me`                  | access token + active session | ویرایش نام، نام خانوادگی یا ایمیل              |
| `PATCH`  | `/auth/me/password`         | access token + active session | تغییر رمز و خروج سایر sessionها                |
| `GET`    | `/auth/sessions`            | access token + active session | فهرست sessionهای فعال                          |
| `DELETE` | `/auth/sessions/others`     | access token + active session | خروج از همه‌ی sessionها به‌جز session جاری     |
| `DELETE` | `/auth/sessions/:sessionId` | access token + active session | باطل‌کردن یک session متعلق به کاربر            |
| `DELETE` | `/auth/sessions`            | access token + active session | خروج از همه‌ی sessionها و پاک‌کردن cookie جاری |

### ثبت‌نام

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "firstName": "Ali",
  "lastName": "Hashemi",
  "email": "ali@example.com",
  "password": "Password123"
}
```

نام و نام خانوادگی پس از trim باید بین ۲ تا ۵۰ کاراکتر باشند. ایمیل trim و lowercase می‌شود و باید یکتا باشد. رمز عبور باید بین ۸ تا ۷۲ کاراکتر و حداکثر ۷۲ بایت UTF-8 باشد و حداقل یک حرف کوچک، یک حرف بزرگ و یک عدد داشته باشد.

پاسخ register و login شامل کاربر و access token است:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66f000000000000000000001",
      "firstName": "Ali",
      "lastName": "Hashemi",
      "email": "ali@example.com",
      "roles": ["user"],
      "createdAt": "2026-07-16T10:00:00.000Z",
      "updatedAt": "2026-07-16T10:00:00.000Z"
    },
    "accessToken": "eyJ..."
  }
}
```

refresh token جداگانه در cookie با نام `refreshToken` قرار می‌گیرد و در JavaScript مرورگر قابل‌خواندن نیست.

### ویرایش پروفایل

حداقل یکی از فیلدها را بفرستید:

```http
PATCH /auth/me
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "firstName": "Amir",
  "lastName": "Hashemi",
  "email": "amir@example.com"
}
```

قبل از تغییر ایمیل، یکتابودن آن برای کاربر دیگری بررسی می‌شود؛ ایمیل تکراری پاسخ `409` می‌گیرد.

### تغییر رمز

```http
PATCH /auth/me/password
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "currentPassword": "Password123",
  "newPassword": "NewPassword456"
}
```

رمز فعلی باید صحیح باشد و رمز جدید باید متفاوت و مطابق قواعد ثبت‌نام باشد. پس از تغییر موفق، تمام refresh sessionهای دیگر با دلیل `password-changed` باطل می‌شوند و session جاری فعال می‌ماند. پاسخ، تعداد `revokedSessions` را برمی‌گرداند.

### مدیریت sessionها

هر login یک refresh session مستقل می‌سازد و اطلاعات دستگاه را در حد `userAgent` و `ipAddress` نگه می‌دارد. پاسخ `GET /auth/sessions` برای هر مورد شامل این فیلدهاست:

```json
{
  "id": "66f000000000000000000010",
  "userAgent": "Mozilla/5.0 ...",
  "ipAddress": "127.0.0.1",
  "createdAt": "2026-07-16T10:00:00.000Z",
  "lastUsedAt": "2026-07-16T10:05:00.000Z",
  "expiresAt": "2026-07-23T10:00:00.000Z",
  "rotationCounter": 2,
  "isCurrent": true
}
```

- `DELETE /auth/sessions/:sessionId` فقط session متعلق به همان کاربر را باطل می‌کند. اگر session جاری باشد `isCurrent: true` برمی‌گرداند و cookie را پاک می‌کند.
- `DELETE /auth/sessions/others` session جاری را نگه می‌دارد.
- `DELETE /auth/sessions` همه‌ی sessionهای فعال را باطل و cookie جاری را پاک می‌کند.
- `POST /auth/logout` حتی بدون cookie معتبر نیز idempotent است و پاسخ موفق می‌دهد.

سند session بعد از revoke برای ثبت سابقه باقی می‌ماند و MongoDB پس از رسیدن `expiresAt` آن را با TTL index به‌صورت eventual حذف فیزیکی می‌کند؛ حذف TTL لحظه‌ای تضمین نمی‌شود. حذف یک کاربر توسط مدیر استثناست و sessionهای آن کاربر را همان موقع به‌صورت فیزیکی حذف می‌کند.

### refresh token rotation

در دیتابیس خود refresh token ذخیره نمی‌شود و فقط SHA-256 hash مربوط به JTI جاری نگهداری می‌شود. هر `POST /auth/refresh`:

1. refresh token و session را اعتبارسنجی می‌کند.
2. JTI را با یک update اتمیک rotate می‌کند.
3. refresh cookie جدید با همان انقضای مطلق می‌فرستد.
4. access token جدید را در JSON برمی‌گرداند.

اگر token قدیمی دوباره استفاده شود، replay تشخیص داده شده و کل همان session با دلیل `reuse-detected` باطل می‌شود. کلاینت باید refreshهای هم‌زمان را single-flight کند.

access token به‌طور پیش‌فرض ۱۵ دقیقه عمر دارد و stateless است، اما همه‌ی routeهای محافظت‌شده‌ی فعلی بعد از بررسی امضا، فعال‌بودن session و وجود کاربر را نیز از دیتابیس بررسی می‌کنند. بنابراین باطل‌کردن session، دسترسی همان access token را فوراً قطع می‌کند.

## Tasks API

Base path: `/tasks`. همه‌ی مسیرهای این بخش به access token و active session نیاز دارند و هر کاربر فقط به تسک‌های خودش دسترسی دارد.

| Method   | Route                   | توضیح                                      |
| -------- | ----------------------- | ------------------------------------------ |
| `GET`    | `/tasks`                | فهرست صفحه‌بندی‌شده‌ی تسک‌های کاربر        |
| `POST`   | `/tasks`                | ساخت تسک                                   |
| `GET`    | `/tasks/summary`        | آمار status، priority و تسک‌های عقب‌افتاده |
| `GET`    | `/tasks/:id`            | دریافت یک تسک متعلق به کاربر               |
| `PATCH`  | `/tasks/:id`            | ویرایش فیلدها یا جایگزینی فایل پیوست       |
| `DELETE` | `/tasks/:id`            | حذف تسک                                    |
| `DELETE` | `/tasks/:id/attachment` | حذف فایل پیوست بدون حذف تسک                |

### فیلدهای تسک

| فیلد          | مقدار                                            |
| ------------- | ------------------------------------------------ |
| `title`       | الزامی در ساخت، ۳ تا ۱۰۰ کاراکتر                 |
| `description` | اختیاری، حداکثر ۲۰۰۰ کاراکتر                     |
| `status`      | `todo`، `in-progress` یا `done`؛ پیش‌فرض `todo`  |
| `priority`    | `low`، `medium` یا `high`؛ پیش‌فرض `medium`      |
| `dueDate`     | ISO 8601 datetime دارای timezone offset؛ اختیاری |
| `completedAt` | زمان واقعی تکمیل؛ فقط توسط سرور مدیریت می‌شود    |
| `attachment`  | فایل اختیاری با field name برابر `attachment`    |

نمونه‌ی ساخت بدون فایل:

```json
{
  "title": "Complete the dashboard",
  "description": "Connect the summary cards to the API",
  "status": "in-progress",
  "priority": "high",
  "dueDate": "2026-08-01T12:00:00.000Z"
}
```

برای ساخت یا ویرایش همراه فایل از `multipart/form-data` استفاده کنید:

```bash
curl -X POST http://localhost:4000/tasks \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "title=Review API documentation" \
  -F "priority=high" \
  -F "attachment=@notes.pdf"
```

فایل‌های مجاز `JPG`، `PNG`، `WEBP`، `PDF` و `TXT` با حداکثر حجم ۵ مگابایت هستند. تنها یک فایل پذیرفته می‌شود. اگر در PATCH فایل جدید ارسال شود، فایل قبلی پس از ذخیره‌ی موفق تسک پاک می‌شود. برای پاک‌کردن `dueDate` در PATCH مقدار خالی form یا `null` در JSON بفرستید.

`completedAt` ورودی API نیست. سرور هنگام تغییر status از `todo` یا `in-progress` به `done` آن را ثبت می‌کند، هنگام ویرایش یک تسک done مقدارش را نگه می‌دارد و با بازکردن دوباره‌ی تسک آن را `null` می‌کند. تسک‌های قدیمی که پیش از اضافه‌شدن این فیلد تکمیل شده‌اند ممکن است مقدار `null` داشته باشند، چون زمان واقعی تکمیل آن‌ها قابل بازیابی نیست.

### فیلتر و صفحه‌بندی تسک‌های شخصی

پارامترهای `GET /tasks`:

| Query       | توضیح                                                    |
| ----------- | -------------------------------------------------------- |
| `status`    | یکی از statusهای معتبر                                   |
| `priority`  | یکی از priorityهای معتبر                                 |
| `search`    | جست‌وجوی case-insensitive در title و description         |
| `dueBefore` | تاریخ معتبر؛ `dueDate <= value`                          |
| `dueAfter`  | تاریخ معتبر؛ `dueDate >= value`                          |
| `page`      | شماره‌ی صفحه؛ پیش‌فرض `1`                                |
| `limit`     | تعداد در صفحه؛ پیش‌فرض `10` و حداکثر `100`               |
| `sortBy`    | `createdAt`، `updatedAt`، `dueDate`، `title` یا `status` |
| `order`     | `asc` یا `desc`؛ پیش‌فرض `desc`                          |

```text
GET /tasks?status=todo&priority=high
GET /tasks?search=typescript
GET /tasks?dueAfter=2026-07-01&dueBefore=2026-08-01&sortBy=dueDate&order=asc
GET /tasks?page=2&limit=20
```

پاسخ لیست‌ها شامل `tasks` و pagination زیر است:

```json
{
  "total": 42,
  "page": 2,
  "limit": 10,
  "totalPages": 5,
  "hasNextPage": true,
  "hasPreviousPage": true
}
```

`GET /tasks/summary` مقادیر `total`، `todo`، `inProgress`، `done`، `low`، `medium`، `high` و `overdue` را برمی‌گرداند. تسک عقب‌افتاده باید dueDate گذشته داشته باشد و status آن `done` نباشد.

## Admin API

Base path: `/admin`. همه‌ی مسیرها سه کنترل پشت‌سرهم دارند:

1. access token معتبر؛
2. refresh session فعال در دیتابیس؛
3. نقش `admin` تازه‌خوانده‌شده از سند User.

### مدیریت همه‌ی تسک‌ها

| Method   | Route                         | توضیح                                |
| -------- | ----------------------------- | ------------------------------------ |
| `GET`    | `/admin/tasks`                | فهرست همه‌ی تسک‌ها همراه owner       |
| `GET`    | `/admin/tasks/:id`            | مشاهده‌ی یک تسک                      |
| `PATCH`  | `/admin/tasks/:id`            | ویرایش هر تسک یا جایگزینی attachment |
| `DELETE` | `/admin/tasks/:id`            | حذف هر تسک و پاک‌سازی attachment     |
| `DELETE` | `/admin/tasks/:id/attachment` | حذف attachment یک تسک                |

پارامترهای `GET /admin/tasks`:

| Query      | توضیح                                                                |
| ---------- | -------------------------------------------------------------------- |
| `search`   | جست‌وجو در title و description، حداکثر ۱۰۰ کاراکتر                   |
| `status`   | `todo`، `in-progress` یا `done`                                      |
| `priority` | `low`، `medium` یا `high`                                            |
| `ownerId`  | MongoDB ObjectId کاربر                                               |
| `page`     | پیش‌فرض `1`                                                          |
| `limit`    | پیش‌فرض `20`، حداکثر `100`                                           |
| `sortBy`   | `createdAt`، `updatedAt`، `dueDate`، `title`، `status` یا `priority` |
| `order`    | `asc` یا `desc`؛ پیش‌فرض `desc`                                      |

```text
GET /admin/tasks?ownerId=66f000000000000000000001&status=todo
GET /admin/tasks?search=invoice&sortBy=priority&order=desc&page=1&limit=20
```

در حذف تسک/attachment، اگر رکورد دیتابیس با موفقیت تغییر کند ولی پاک‌سازی Cloudinary شکست بخورد، پاسخ موفق باقی می‌ماند و `attachmentCleanupFailed: true` گزارش می‌شود.

### مدیریت کاربران

| Method   | Route                         | توضیح                                          |
| -------- | ----------------------------- | ---------------------------------------------- |
| `GET`    | `/admin/users`                | فهرست کاربران                                  |
| `GET`    | `/admin/users/:id`            | کاربر همراه `taskCount` و `activeSessionCount` |
| `PATCH`  | `/admin/users/:id`            | تغییر نام، نام خانوادگی یا ایمیل               |
| `PATCH`  | `/admin/users/:id/admin-role` | افزودن یا حذف نقش مدیر                         |
| `DELETE` | `/admin/users/:id`            | حذف کاربر و داده‌های مرتبط                     |

پارامترهای `GET /admin/users`:

- `search`: جست‌وجو در نام، نام خانوادگی و ایمیل؛ حداکثر ۱۰۰ کاراکتر
- `role`: فقط `user` یا `admin`
- `page`: پیش‌فرض `1`
- `limit`: پیش‌فرض `20` و حداکثر `100`

ویرایش اطلاعات کاربر مشابه profile است و باید حداقل یک فیلد داشته باشد؛ ایمیل تکراری پاسخ `409` می‌گیرد.

برای تغییر نقش:

```http
PATCH /admin/users/66f000000000000000000001/admin-role
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

```json
{ "isAdmin": true }
```

نقش‌های نهایی همیشه یا `["user"]` یا `["user", "admin"]` هستند. در صورت تغییر نقش، همه‌ی sessionهای فعال کاربر هدف با دلیل `role-changed` باطل می‌شوند و تعداد آن‌ها در `sessionsRevoked` می‌آید.

محدودیت‌های حفاظتی:

- مدیر نمی‌تواند نقش admin خودش را حذف کند.
- مدیر نمی‌تواند حساب خودش را از admin endpoint حذف کند.
- آخرین مدیر سیستم قابل demote یا delete نیست.
- حذف کاربر، تسک‌ها و refresh sessionهای او را حذف می‌کند و برای پاک‌کردن attachmentهای Cloudinary تلاش می‌کند.

### ساخت اولین مدیر

کاربرها با نقش `user` ثبت‌نام می‌شوند. برای bootstrap اولین مدیر، یک‌بار مستقیماً در MongoDB اجرا کنید:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $addToSet: { roles: "admin" } });
```

بعد از آن مدیر می‌تواند از `PATCH /admin/users/:id/admin-role` استفاده کند.

## Rate limiting احراز هویت

| Route                 |          مقدار پیش‌فرض | نحوه‌ی شمارش                          |
| --------------------- | ---------------------: | ------------------------------------- |
| `POST /auth/register` |   ۵ درخواست در یک ساعت | همه‌ی درخواست‌ها بر اساس IP           |
| `POST /auth/login`    | ۱۰ درخواست در ۱۵ دقیقه | فقط loginهای ناموفق بر اساس IP        |
| `POST /auth/refresh`  | ۳۰ درخواست در ۱۵ دقیقه | refreshهای ناموفق بر اساس IP          |
| `POST /auth/refresh`  | ۳۰ درخواست در ۱۵ دقیقه | همه‌ی refreshها بر اساس session معتبر |

پاسخ محدودشده status `429` و headerهای استاندارد `RateLimit` دارد. store فعلی in-memory است و برای یک process مناسب است؛ در deployment چندنمونه‌ای باید store اشتراکی مانند Redis جایگزین شود.

## Build و بررسی TypeScript

از ریشه‌ی پروژه:

```bash
npm run typecheck --workspace server
npm run build --workspace server
npm run start:server
```

build در پوشه‌ی `server/dist` تولید می‌شود.
