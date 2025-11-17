import { sendMessage } from "../lib/lark.js";

export default async function handler(req, res) {
  // 只接受 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const update = req.body;

    // 提取訊息
    const message = update.channel_post || update.message;

    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const text = message.text || "";
    const messageId = message.message_id;
    const chatId = message.chat?.id;

    console.log(`📨 收到訊息: [${chatId}] ${text}`);

    try {
      await sendMessage({
        text,
        messageId,
        chatId,
        type: "error",
      });
    } catch (err) {
      console.error(`❌ Lark 轉發失敗: ${err.message}`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`❌ Webhook 錯誤: ${err.message}`);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
