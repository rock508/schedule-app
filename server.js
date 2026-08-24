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
};

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/auto-battle", (req, res) => {
  const saveData = loadSaveData();
  const bossStats = getBossStats(saveData.bossMonth);
  res.json({
    bossHp: saveData.bossHp,
    bossMaxHp: saveData.bossMaxHp,
    bossMonth: saveData.bossMonth,
    bossAttack: bossStats.attack,
    bossDefense: bossStats.defense,
    bossSpeed: bossStats.speed,
    canBattle: saveData.lastBattleDate !== getToday(),
  });
});

app.post("/api/auto-battle", (req, res) => {
  const saveData = loadSaveData();
  const today = getToday();

  if (saveData.lastBattleDate === today) {
    return res.status(409).json({
      message: "オートバトルは今日はもう使えません。",
      bossHp: saveData.bossHp,
      bossMaxHp: saveData.bossMaxHp,
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

  const bossStats = getBossStats(saveData.bossMonth);
  return res.json({
    damage,
    bossHp: saveData.bossHp,
    bossMaxHp: saveData.bossMaxHp,
    bossMonth: saveData.bossMonth,
    bossAttack: bossStats.attack,
    bossDefense: bossStats.defense,
    bossSpeed: bossStats.speed,
    canBattle: false,
  });
});

app.post("/api/auto-battle/reset", (req, res) => {
  const saveData = loadSaveData();
  saveData.bossHp = saveData.bossMaxHp;
  saveData.lastBattleDate = null;
  saveSaveData(saveData);
  const bossStats = getBossStats(saveData.bossMonth);

  return res.json({
    bossHp: saveData.bossHp,
    bossMaxHp: saveData.bossMaxHp,
    bossMonth: saveData.bossMonth,
    bossAttack: bossStats.attack,
    bossDefense: bossStats.defense,
    bossSpeed: bossStats.speed,
    canBattle: true,
  });
});

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

function loadSaveData() {
  try {
    const saved = JSON.parse(fs.readFileSync(saveFile, "utf8"));
    if (!Number.isInteger(saved.bossMonth) || saved.bossMonth < 1) {
      return { ...defaultSaveData };
    }
    const bossStats = getBossStats(saved.bossMonth);
    return {
      ...defaultSaveData,
      ...saved,
      bossMaxHp: bossStats.hp,
      bossHp: Math.min(
        Math.max(Number(saved.bossHp) || bossStats.hp, 0),
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
