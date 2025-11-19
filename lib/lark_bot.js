import axios from "axios";
import { formatDateTime, getFarm } from "./lark_utils.js";

let cachedToken = null;
let tokenExpiresAt = null;

async function getTenantAccessToken() {
  if (cachedToken && tokenExpiresAt > Date.now()) {
    return cachedToken;
  }

  const response = await fetch("https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  });

  const data = await response.json();

  // 快取 token（留出安全邊距）
  cachedToken = data.tenant_access_token;
  tokenExpiresAt = Date.now() + (data.expire - 60 * 5) * 1000;

  return cachedToken;
}

async function getUserId(mail) {
  const response = await axios.post(
    "https://open.larksuite.com/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id",
    {
      emails: [mail],
      include_resigned: false,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getTenantAccessToken()}`,
      },
    }
  );
  if (response.data.code !== 0) {
    console.error("Lark API Error:", response.data);
    return null;
  }

  const user = response.data.data.user_list.find((u) => u.email === mail);
  if (!user) {
    console.warn(`User not found for email: ${mail}`);
    return null;
  }
  return user.user_id;
}

export function getMessagePost(messageText) {
  const title = messageText.split("\n")[0];
  const farm = getFarm(messageText);

  return {
    zh_cn: {
      title,
      content: [
        [
          {
            tag: "text",
            text: `Farm: ${farm}`,
            style: ["bold", "underline"],
          },
          {
            tag: "text",
            text: formatDateTime() + " (UTC+8)",
            style: ["bold", "underline"],
          },
        ],
      ],
    },
  };
}

export async function sendMessageByEmail(email, messageText) {
  try {
    const response = await axios.post(
      "https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=email",
      {
        content: JSON.stringify({ text: getMessagePost(messageText) }),
        msg_type: "text",
        receive_id: email,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getTenantAccessToken()}`,
        },
      }
    );
    console.log(`✅ Lark 郵件訊息發送成功: [${email}] ${messageText.substring(0, 20)}...`);
    return response.data;
  } catch (error) {
    console.warn(`❌ Lark 郵件訊息發送失敗: [${email}] ${error.message}`, {
      statusCode: error.response?.status,
      data: error.response?.data,
    });
  }
}
