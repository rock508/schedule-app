// server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // フロントエンド（Go Live）からの通信を許可する設定
app.use(express.json());

// 💡 【重要】あなたのGemini APIキーをここに貼り付けてください
const GEMINI_API_KEY = "ここにあなたのAPIキーを入れる";

// フロント（画面）から予定と褒め言葉を受け取る口
app.post("/api/check-schedule", async (req, res) => {
  const { schedule, praise } = req.body;

  // AIへの命令文（プロンプト）
  const prompt = `あなたはツンデレなカレンダーAIキャラクターです。
    ユーザーがあなたに予定を追加しようとしています。
    ユーザーからあなたへの「褒め言葉」を厳しく審査してください。

    【ユーザーの褒め言葉】
    "${praise}"

    【審査ルール】
    1. 褒め言葉の熱量が足りない、または雑な場合は 0〜50点（登録拒否）
    2. そこそこ褒めていれば 51〜79点（渋々登録）
    3. 命がけで大絶賛、デザインを褒める、感謝を伝えている場合は 80〜100点（ツンデレで大歓喜）

    【出力形式】
    必ず以下のJSON形式の文字列だけで返答してください。余計な挨拶や説明文は一切含めないでください。
    {"score": 点数, "status": "dere"または"tsun"または"angry", "message": "ツンデレなセリフ"}
    `;

  try {
    // バックエンド（Node.js）からGemini APIを安全に呼び出す
    const response = await fetch(`https://googleapis.com{GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const data = await response.json();
    const aiResponseText = data.candidates.content.parts.text;

    // AIの返答（JSON）を解析してフロントにそのまま返す
    const result = JSON.parse(
      aiResponseText.replace(/```json|```/g, "").trim(),
    );
    res.json(result);
  } catch (error) {
    console.error("エラーが発生:", error);
    res.status(500).json({ error: "サーバー側でエラーが起きたわよ！" });
  }
});

// 3000番ポートでお留守番を開始
app.listen(3000, () =>
  console.log("🚀 ツンデレNode.jsサーバーが3000番ポートで起動したわよ！"),
);
