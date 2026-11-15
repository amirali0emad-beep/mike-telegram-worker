# موتور ابری مایک (نسخه پایه)

این بسته یک اسکلت اولیه برای دریافت Webhook تلگرام روی Cloudflare Workers است.
این نسخه **هنوز فرمان‌های Notion و Google Calendar را اجرا نمی‌کند**؛ فقط دریافت پیام،
ثبت تاریخچه در D1 و پاسخ پایه برای `/start`، `/help` و `/status` را آماده می‌کند.

## معماری
- Cloudflare Worker: دریافت Webhook تلگرام
- Cloudflare D1: ثبت تاریخچه فرمان‌ها
- Telegram Bot API: ارسال پاسخ
- Composio: در مرحله بعد به‌عنوان لایه اجرای ابزارها متصل می‌شود

## پیش‌نیازها
1. حساب Cloudflare با Workers و D1
2. Node.js و npm روی دستگاهی که فقط برای مرحله Deploy استفاده می‌شود
3. توکن Bot مایک از BotFather
4. یک Project API Key از Composio
5. شناسه اتصال‌های فعال Composio برای Notion و Google Calendar

کلیدها و توکن‌ها را داخل چت یا فایل‌های عمومی قرار نده. آن‌ها را فقط به‌صورت Secret در Cloudflare تنظیم کن.

## راه‌اندازی اولیه
```bash
npm install
npx wrangler login
npx wrangler d1 create mike-db
```
شناسه دیتابیس برگشتی را در `wrangler.toml` جایگزین `REPLACE_WITH_D1_DATABASE_ID` کن.

```bash
npx wrangler d1 execute mike-db --remote --file=./schema.sql
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put OWNER_TELEGRAM_USER_ID
npx wrangler deploy
```

`OWNER_TELEGRAM_USER_ID` شناسه عددی حساب تلگرام مجاز است.
`TELEGRAM_WEBHOOK_SECRET` یک رشته تصادفی بلند باشد.

پس از Deploy، آدرس Worker شبیه این خواهد بود:
`https://mike-telegram-worker.<your-subdomain>.workers.dev`

Webhook را با درخواست زیر ثبت کن (توکن را در ترمینال وارد کن، نه در چت):
```bash
curl -X POST "https://api.telegram.org/bot< BOT_TOKEN >/setWebhook" \
  -H "content-type: application/json" \
  -d '{"url":"https://<WORKER_HOST>/telegram/webhook","secret_token":"<WEBHOOK_SECRET>","allowed_updates":["message"]}'
```

سلامت Worker:
`https://<WORKER_HOST>/health`

## زمان‌بندی
سه Cron از قبل در `wrangler.toml` قرار داده شده‌اند:
- 05:30 UTC = 09:00 تهران
- 11:30 UTC = 15:00 تهران
- 18:00 UTC = 21:30 تهران

فعلاً این Cronها فقط اجرا را ثبت می‌کنند؛ گزارش‌سازی تا اتصال کامل Notion و Calendar فعال نمی‌شود.

## مرحله بعد
- افزودن نقشه فرمان به ابزارهای واقعی Composio با schema دقیق هر ابزار
- تعیین toolkit version و connected account ID برای هر اتصال
- صف تأیید برای تمام عملیات تغییردهنده
- جلوگیری از اجرای تکراری با update_id و شناسه عملیات
- پیاده‌سازی گزارش‌های زمان‌بندی‌شده و ثبت نتیجه ارسال
- افزودن parser پارامترها و اعتبارسنجی ورودی هر فرمان
