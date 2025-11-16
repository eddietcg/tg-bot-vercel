import axios from "axios";
import { sendMessage } from "../lib/lark.js";

/**
 * 你的 Lark 轉發函數
 * @param {Object} msgData
 */
async function lark(msgData) {
  console.log("🔔 Lark 轉發:", msgData);

  // 實現你的 Lark 邏輯
  // 例如：
  // await axios.post('https://open.larksuite.com/open-apis/bot/v2/hook/xxx', {
  //   msg_type: 'text',
  //   content: { text: msgData.text }
  // });
}

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
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] 📨 收到訊息: [${chatId}] ${text.slice(0, 50)}`);

    // 監聽關鍵字 'xx'
    if (text.includes("xx")) {
      console.log(`[${timestamp}] 🎯 觸發關鍵字 'xx'`);

      try {
        await lark({
          text,
          messageId,
          chatId,
          timestamp,
        });
      } catch (err) {
        console.error(`❌ Lark 轉發失敗: ${err.message}`);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`❌ Webhook 錯誤: ${err.message}`);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
