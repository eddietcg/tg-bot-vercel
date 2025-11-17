import axios from "axios";

// 消息類型常量
const MESSAGE_TYPES = {
  REPORTER_FARM: "REPORTER_FARM",
  PROD_WPS_TEST: "PROD_WPS_TEST",
  SERVICE_RESTART: "SERVICE_RESTART",
  NEW_ERROR_CODE: "NEW_ERROR_CODE",
  DEFAULT: "DEFAULT",
};

// Template 顏色映射
const TEMPLATE_COLORS = {
  [MESSAGE_TYPES.REPORTER_FARM]: "turquoise",
  [MESSAGE_TYPES.PROD_WPS_TEST]: "green",
  [MESSAGE_TYPES.SERVICE_RESTART]: "orange",
  [MESSAGE_TYPES.NEW_ERROR_CODE]: "red",
  [MESSAGE_TYPES.DEFAULT]: "turquoise",
};

function trim(str) {
  if (!str) return str;
  return (str || "").trim();
}

export async function sendMessage({ text, type, messageId, chatId, timestamp }) {
  const parsedResult = parse(text);
  if (!parsedResult) {
    return Promise.reject(new Error(`${text} 不支援轉送到 lark`));
  }

  const { content: msgContent, type: messageType } = parsedResult;
  const title = getTitle(text);
  const body = await buildCard(title, msgContent, messageType);
  let LARK_URL = process.env.LARK_WEBHOOK_URL;
  if (type) {
    LARK_URL = process.env[`LARK_WEBHOOK_URL_${type.toUpperCase()}`];
  }

  // console.log("sendMessage to ", LARK_URL);
  console.log("card body", JSON.stringify(body));

  return axios.post(LARK_URL, body);
}

// 偵測消息類型
function detectMessageType(msg) {
  if (msg.includes("REPORTER") && msg.includes("FARM")) {
    return MESSAGE_TYPES.REPORTER_FARM;
  } else if (msg.includes("Prod WPS test")) {
    return MESSAGE_TYPES.PROD_WPS_TEST;
  } else if (msg.includes("SERVICE RESTART")) {
    return MESSAGE_TYPES.SERVICE_RESTART;
  } else if (msg.includes("New Error Code Found")) {
    return MESSAGE_TYPES.NEW_ERROR_CODE;
  }
  return MESSAGE_TYPES.DEFAULT;
}

function getTitle(text) {
  if (text.includes("New Error Code Found")) {
    return trim(text.split("\n")[0]) + " " + trim(text.split("\n")[1]);
  }
  return trim(text.split("\n")[0]) || trim(text.split("\n")[1]);
}

function parse(msg) {
  const messageType = detectMessageType(msg);

  if (msg.includes("REPORTER") && msg.includes("FARM")) {
    const lines = msg.split("\n");
    const result = [];

    lines.forEach((line, index) => {
      if (index === 0) {
        // 移除第一行，直接跳過
      } else if (index === 1) {
        // 第2列添加粗體（原本的第2列）
        result.push(`**${line}**`);
      } else if (line.includes("=")) {
        // 用 = 拆解，=後第二組加粗體
        const parts = line.split("=");
        if (parts.length >= 2) {
          result.push(`${parts[0].trim()} = **${parts[1].trim()}**`);
        } else {
          result.push(line);
        }
      } else {
        result.push(line);
      }
    });
    return {
      content: result.join("\n"),
      type: messageType,
    };
  } else if (msg.includes("Prod WPS test")) {
    const lines = msg.split("\n");
    const result = [];
    lines.forEach((line, index) => {
      if (index === 0) {
        // 移除第一行，直接跳過
      } else {
        result.push(line);
      }
    });
    return {
      content: result.join("\n"),
      type: messageType,
    };
  } else if (msg.includes("SERVICE RESTART")) {
    const lines = msg.split("\n");
    const result = [];
    lines.forEach((line, index) => {
      if (index <= 1) {
      } else if (line.includes("════")) {
        // 跳過包含 ════ 的行
      } else {
        result.push(line);
      }
    });
    return {
      content: result.join("\n"),
      type: messageType,
    };
  } else if (msg.includes("New Error Code Found")) {
    const lines = msg.split("\n");
    const result = [];
    lines.forEach((line, index) => {
      if (index <= 2) {
      } else {
        result.push(line);
      }
    });
    return {
      content: result.join("\n"),
      type: messageType,
    };
  }
  return null;
}

// 組合卡片 body 元素
function buildBodyElements(title, message) {
  const elements = [
    {
      tag: "div",
      element_id: "time",
      text: {
        tag: "lark_md",
        content:
          "**Time** **<local_datetime format_type='date_num'></local_datetime> <local_datetime format_type='time_sec'></local_datetime> (<local_datetime format_type='timezone'></local_datetime>)**",
      },
    },
    {
      tag: "hr",
    },
  ];

  // 其他資訊
  elements.push(
    ...[
      message
        ? {
            tag: "div",
            element_id: "message",
            text: {
              tag: "lark_md",
              content: message,
            },
          }
        : null,
    ].filter(Boolean)
  );

  return elements;
}

// 主函式：組合完整的 Lark 卡片 JSON
async function buildCard(title, msg, messageType = MESSAGE_TYPES.UNKNOWN) {
  const bodyElements = buildBodyElements(title, msg);
  const templateColor = TEMPLATE_COLORS[messageType] || TEMPLATE_COLORS[MESSAGE_TYPES.UNKNOWN];

  return {
    msg_type: "interactive",
    card: {
      schema: "2.0",
      config: {
        update_multi: true,
      },
      card_link: {
        url: null,
      },
      header: {
        title: {
          content: title,
          tag: "plain_text",
        },
        template: templateColor,
      },
      body: {
        direction: "vertical",
        padding: "12px 8px 12px 8px",
        vertical_spacing: "8px",
        elements: bodyElements,
      },
    },
  };
}
