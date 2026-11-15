const COMMANDS = [
  "research","brainstorm","analyze","compare","decision","today","tasks","task","plan","review","calendar",
  "projects","project","idea","improve","strategy","progress","report","summary","insights","stats",
  "addevent","moveevent","remind","done","addtask","inbox","email","reply","send","draft",
  "help","status","history","approve","cancel"
];

const WRITE_COMMANDS = new Set([
  "task","idea","addevent","moveevent","remind","done","addtask","email","reply","send","draft",
  "approve","cancel"
]);

function parseCommand(text) {
  const match = String(text || "").trim().match(/^\/([a-z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: (match[2] || "").trim() };
}

async function telegramSend(env, chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  if (!response.ok) throw new Error(`Telegram send failed: ${response.status}`);
  return response.json();
}

async function logCommand(env, data) {
  await env.DB.prepare(
    "INSERT INTO command_logs (telegram_user_id, chat_id, command, args, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(
    String(data.userId), String(data.chatId), data.command, data.args || "", data.status, new Date().toISOString()
  ).run();
}

async function handleUpdate(update, env) {
  const message = update.message;
  if (!message?.text || !message.chat?.id) return;
  const userId = String(message.from?.id || "");
  const chatId = String(message.chat.id);

  // Allow only the owner account configured in Cloudflare secrets.
  if (!env.OWNER_TELEGRAM_USER_ID || userId !== String(env.OWNER_TELEGRAM_USER_ID)) return;

  const parsed = parseCommand(message.text);
  if (!parsed) {
    await telegramSend(env, chatId, "پیامت را دریافت کردم. برای استفاده از فرمان‌ها، منوی / را باز کن.");
    return;
  }

  const { command, args } = parsed;
  if (command === "start" || command === "help") {
    await logCommand(env, { userId, chatId, command, args, status: "handled" });
    await telegramSend(env, chatId,
      "سلام! من مایک هستم.\n\nفرمان‌ها از منوی تلگرام قابل مشاهده‌اند.\n\nدر حال حاضر موتور دریافت پیام فعال است؛ اتصال اجرایی فرمان‌های Notion و Google Calendar در مرحله بعد تکمیل می‌شود.");
    return;
  }

  if (command === "status") {
    await logCommand(env, { userId, chatId, command, args, status: "handled" });
    await telegramSend(env, chatId, "وضعیت موتور: فعال\nدریافت Webhook: فعال\nاتصال اجرای فرمان‌ها به Composio: در انتظار پیکربندی");
    return;
  }

  if (!COMMANDS.includes(command)) {
    await logCommand(env, { userId, chatId, command, args, status: "rejected_unknown" });
    await telegramSend(env, chatId, `فرمان ناشناخته است: /${command}\nاز /help برای راهنما استفاده کن.`);
    return;
  }

  const status = WRITE_COMMANDS.has(command) ? "awaiting_dispatch_and_approval" : "awaiting_dispatch";
  await logCommand(env, { userId, chatId, command, args, status });
  await telegramSend(env, chatId,
    `فرمان /${command} دریافت شد${args ? `.\nورودی: ${args}` : "."}\n\nموتور دریافت پیام درست کار می‌کند؛ اتصال این فرمان به ابزار اجرایی مربوطه هنوز پیکربندی نشده است. هیچ تغییری در سرویس‌های متصل انجام نشد.`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({ ok: true, service: "mike-telegram-worker", mode: "webhook-scaffold" });
    }

    if (url.pathname !== "/telegram/webhook" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    let update;
    try {
      update = await request.json();
      await handleUpdate(update, env);
    } catch (error) {
      // Avoid leaking secrets or internal stack traces to Telegram.
      console.error("Webhook handler error", String(error));
      return new Response("Temporary failure", { status: 500 });
    }
    return Response.json({ ok: true });
  },

  async scheduled(event, env, ctx) {
    // Reserved for scheduled reports. No report is sent until the report workflow is wired.
    console.log("Scheduled trigger received", event.cron);
  }
};
