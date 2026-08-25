const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 5500;
const saveFile = path.join(__dirname, "save-data.json");
const defaultSaveData = {
  bossMonth: 1,
  bossMaxHp: 200,
  bossHp: 200,
  lastBattleDate: null,
  currentDate: null,
  playerLevel: 1,
  playerAttack: 1,
};

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/auto-battle", (req, res) => {
  const saveData = loadSaveData();
  res.json({
    ...getGameState(saveData),
    canBattle: saveData.lastBattleDate !== saveData.currentDate,
  });
});

app.post("/api/auto-battle", (req, res) => {
  const saveData = loadSaveData();
  const today = saveData.currentDate;

  if (saveData.lastBattleDate === today) {
    return res.status(409).json({
      message: "オートバトルは今日はもう使えません。",
      ...getGameState(saveData),
      canBattle: false,
    });
  }

  const damage = Math.min(100, saveData.bossHp);
  saveData.bossHp -= damage;
  if (saveData.bossHp === 0) {
    saveData.bossMonth += 1;
    const nextBossStats = getBossStats(saveData.bossMonth);
    saveData.bossMaxHp = nextBossStats.hp;
    saveData.bossHp = nextBossStats.hp;
  }
  saveData.lastBattleDate = today;
  saveSaveData(saveData);

  return res.json({ damage, ...getGameState(saveData), canBattle: false });
});

app.post("/api/auto-battle/reset", (req, res) => {
  const saveData = loadSaveData();
  saveData.bossHp = saveData.bossMaxHp;
  saveData.lastBattleDate = null;
  saveData.playerLevel = 1;
  saveData.playerAttack = 1;
  saveSaveData(saveData);
  return res.json({ ...getGameState(saveData), canBattle: true });
});

app.post("/api/god-mode", (req, res) => {
  const saveData = loadSaveData();
  const { action, value } = req.body || {};

  if (action === "advance-day") {
    saveData.currentDate = addDays(saveData.currentDate, 1);
  } else if (action === "kill-boss") {
    saveData.bossHp = 0;
  } else if (action === "reset") {
    saveData.bossHp = saveData.bossMaxHp;
    saveData.lastBattleDate = null;
    saveData.playerLevel = 1;
    saveData.playerAttack = 1;
  } else if (action === "change-attack") {
    const attack = Number(value);
    if (!Number.isFinite(attack) || attack < 0) {
      return res
        .status(400)
        .json({ message: "攻撃力には0以上の数値を入力してください。" });
    }
    saveData.playerAttack = Math.floor(attack);
  } else {
    return res.status(400).json({ message: "不明な神の手アクションです。" });
  }

  saveSaveData(saveData);
  return res.json({
    gameState: getGameState(saveData),
    canBattle: saveData.lastBattleDate !== saveData.currentDate,
  });
});

function getGameState(saveData) {
  const bossStats = getBossStats(saveData.bossMonth);
  return {
    bossHp: saveData.bossHp,
    bossMaxHp: saveData.bossMaxHp,
    bossMonth: saveData.bossMonth,
    bossAttack: bossStats.attack,
    bossDefense: bossStats.defense,
    bossSpeed: bossStats.speed,
    currentDate: saveData.currentDate,
    playerLevel: saveData.playerLevel,
    playerAttack: saveData.playerAttack,
  };
}

function getBossStats(bossMonth) {
  const monthIndex = bossMonth - 1;
  return {
    hp: Math.round(200 * 1.5 ** monthIndex),
    attack: 10 + monthIndex * 40,
    defense: 10 + monthIndex * 40,
    speed: 5 + monthIndex * 40,
  };
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadSaveData() {
  try {
    const saved = JSON.parse(fs.readFileSync(saveFile, "utf8"));
    if (!Number.isInteger(saved.bossMonth) || saved.bossMonth < 1) {
      return { ...defaultSaveData };
    }
    const bossStats = getBossStats(saved.bossMonth);
    const savedBossHp = Number(saved.bossHp);
    return {
      ...defaultSaveData,
      ...saved,
      currentDate: saved.currentDate || getToday(),
      playerLevel:
        Number.isInteger(saved.playerLevel) && saved.playerLevel >= 1
          ? saved.playerLevel
          : 1,
      playerAttack:
        Number.isFinite(Number(saved.playerAttack)) &&
        Number(saved.playerAttack) >= 0
          ? Math.floor(Number(saved.playerAttack))
          : 1,
      bossMaxHp: bossStats.hp,
      bossHp: Math.min(
        Math.max(Number.isFinite(savedBossHp) ? savedBossHp : bossStats.hp, 0),
        bossStats.hp,
      ),
    };
  } catch {
    return { ...defaultSaveData };
  }
}

function saveSaveData(saveData) {
  fs.writeFileSync(saveFile, JSON.stringify(saveData, null, 2));
}

app.listen(port, () => {
  console.log(`Calendar app: http://localhost:${port}`);
});
