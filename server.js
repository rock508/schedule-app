const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 5500;
const saveFile = path.join(__dirname, "save-data.json");
const defaultSaveData = {
  bossMaxHp: 1000,
  bossHp: 1000,
  lastBattleDate: null,
};

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/auto-battle", (req, res) => {
  const saveData = loadSaveData();
  res.json({
    bossHp: saveData.bossHp,
    bossMaxHp: saveData.bossMaxHp,
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
  saveData.lastBattleDate = today;
  saveSaveData(saveData);

  return res.json({
    damage,
    bossHp: saveData.bossHp,
    bossMaxHp: saveData.bossMaxHp,
    canBattle: false,
  });
});

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
    return { ...defaultSaveData, ...saved };
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
