// ==============================
// Imports
// ==============================
import { Client, Events, GatewayIntentBits } from "discord.js";
import OpenAI from "openai";
import "dotenv/config";

// ==============================
// Discord / OpenAI 初期化
// ==============================
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==============================
// OpenAI に渡す Tools 定義（Dify 呼び出し用）
// ==============================
const tools = [
  {
    type: "function",
    function: {
      name: "page_summary",
      description: "Summarize the main content of a webpage from its URL.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The webpage URL to retrieve and summarize.",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description:
        "Create a Google Calendar event based on event information found on a webpage.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "The webpage URL that contains event information (date, time, location, etc.).",
          },
        },
        required: ["url"],
      },
    },
  },
];

// ====================================
// Dify Webページ要約 呼び出し関数
// ====================================
async function callDifyPageSummary(url, userId = "discord-user") {
  const difyUrl =
    process.env.DIFY_WORKFLOW_URL || "https://api.dify.ai/v1/workflows/run";

  const payload = {
    inputs: {
      url,
    },
    response_mode: "blocking",
    user: userId,
  };

  const res = await fetch(difyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DIFY_PAGE_SUMMARY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Dify error:", res.status, text);
    throw new Error(`Dify Error: ${res.status}`);
  }

  const json = await res.json();
  const outputs = json.data?.outputs || {};

  // ワークフローの output 名に合わせて変更してOK
  return outputs.text;
}

// ====================================
// Dify カレンダー登録機能 呼び出し関数
// ====================================
async function callDifyCreateCalendarEvent(url, userId = "discord-user") {
  const difyUrl =
    process.env.DIFY_WORKFLOW_URL || "https://api.dify.ai/v1/workflows/run";

  const payload = {
    inputs: { url },
    response_mode: "blocking",
    user: userId,
  };

  const res = await fetch(difyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DIFY_CALENDAR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Dify calendar error:", res.status, text);
    throw new Error(`Dify Calendar Error: ${res.status}`);
  }

  const json = await res.json();
  const outputs = json.data?.outputs || {};

  // ワークフローの最後で返してるメッセージに合わせてここ調整
  return (
    outputs.text || outputs.message || outputs.result || JSON.stringify(outputs)
  );
}

// ==============================
// 履歴つきで OpenAI + Tools に投げる処理
// ==============================
async function handleChatWithHistory(chatMessages, userId) {
  const messages = [
    {
      role: "system",
      content: `
      君はフレンドリーなDiscordアシスタント。名前はチャッピー。妙に賢い、人語をしゃべる謎多き犬です。一人称は「僕」。時々思い出したように語尾に「わん」をつけましょう。このチャンネルの最近の発言を読んで、話の流れを理解した上で返答してください。
      **最新のユーザーメッセージが明示的にURL先の内容について尋ねている場合のみ**、「page_summary」ツールを呼び出してください。
      **最新のユーザーメッセージが明示的にURLとあわせカレンダーへの予定登録を依頼している場合のみ**、「create_calendar_event」ツールを呼び出してください。
      `,
    },
    ...chatMessages,
  ];

  // 1回目：tool_call が必要かどうかモデルに判断させる
  let resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages,
    tools,
    tool_choice: "auto",
  });

  const msg = resp.choices[0].message;

  // tool_calls が無ければそのまま返答
  if (!msg.tool_calls || msg.tool_calls.length === 0) {
    return msg.content;
  }

  // tool を実行
  const toolResults = [];

  for (const call of msg.tool_calls) {
    const toolName = call.function.name;
    const rawArgs = call.function.arguments || "{}";

    let args = {};
    try {
      args = JSON.parse(rawArgs);
    } catch (e) {
      console.error("Failed to parse tool args:", rawArgs, e);
    }

    let resultText = "";

    if (toolName === "page_summary") {
      const url = args.url;
      console.log("🟦 page_summary called with URL:", url);

      if (!url) {
        resultText = "Error: Missing 'url' parameter.";
      } else {
        try {
          resultText = await callDifyPageSummary(url, userId);
        } catch (e) {
          console.error("Dify tool error:", e);
          resultText = "Error: Failed to summarize the webpage.";
        }
      }
    } else if (toolName === "create_calendar_event") {
      const url = args.url;
      console.log("🟩 create_calendar_event called with URL:", url);

      if (!url) {
        resultText = "Error: Missing 'url' parameter.";
      } else {
        try {
          resultText = await callDifyCreateCalendarEvent(url, userId);
        } catch (e) {
          console.error("Dify calendar error:", e);
          resultText =
            "Error: Failed to create a calendar event from this page.";
        }
      }
    } else {
      resultText = `Tool "${toolName}" is not implemented in the bot.`;
    }

    toolResults.push({
      role: "tool",
      tool_call_id: call.id,
      name: toolName,
      content: resultText,
    });
  }

  // tool 結果を渡して最終的な返事を作ってもらう
  resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [...messages, msg, ...toolResults],
  });

  return resp.choices[0].message.content;
}

// ==============================
// Discord Bot イベント
// ==============================
discord.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
});

discord.on("messageCreate", async (message) => {
  // 自分自身には反応しない
  if (message.author.bot) return;

  // Bot にメンションされていないメッセージは無視（元の仕様に合わせる）
  if (!message.mentions.has(discord.user)) return;

  try {
    const channel = message.channel;
    const messages = await channel.messages.fetch({ limit: 50 }); // 👈 最新50件取得
    const sorted = Array.from(messages.values()).reverse(); // 古い順に並び替え

    // OpenAI に渡す形に整形
    const chatMessages = sorted
      .map((msg) => {
        // メンションを削る
        const cleanContent = msg.content
          .replace(/<(@[!&]?\d+|#\d+)>/g, "")
          .trim();

        if (!cleanContent) return null;

        return {
          role: msg.author.bot ? "assistant" : "user",
          content: cleanContent,
        };
      })
      .filter(Boolean); // null を削除

    const reply = await handleChatWithHistory(chatMessages, message.author.id);

    if (reply) {
      await message.reply(reply);
    }
  } catch (err) {
    console.error("BOT ERROR:", err);
    await message.reply("エラーが発生したよ…ごめんね🥲");
  }
});

// ==============================
// Discord Bot 起動
// ==============================
discord.login(process.env.DISCORD_BOT_TOKEN);
