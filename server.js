const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 5500;
const saveFile = path.join(__dirname, "save-data.json");
const defaultSaveData = {
  bossNumber: 1,
  bossMaxHp: 200,
  bossHp: 200,
  lastBattleDate: null,
  currentDate: null,
  playerLevel: 1,
  playerHp: 20,
  playerMaxHp: 20,
  playerAttack: 1,
  playerDefense: 1,
  playerSpeed: 1,
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

  const requestedPlayerSpeed = Number(req.body?.playerSpeed);
  if (Number.isFinite(requestedPlayerSpeed) && requestedPlayerSpeed >= 0) {
    saveData.playerSpeed = Math.floor(requestedPlayerSpeed);
  }
  const bossStats = getBossStats(saveData.bossNumber);
  const turns = [];
  let bossHp = saveData.bossHp;
  let playerHp = saveData.playerHp;
  const initialBossHp = bossHp;
  const initialPlayerHp = playerHp;
  const playerMaxHp = saveData.playerMaxHp;
  let playerTurn = saveData.playerSpeed > bossStats.speed;

  while (bossHp > 0 && playerHp > 0) {
    const bossHpBefore = bossHp;
    const playerHpBefore = playerHp;
    const damage = playerTurn
      ? Math.min(
          calculateDamage(saveData.playerAttack, bossStats.defense),
          bossHp,
        )
      : Math.min(
          calculateDamage(bossStats.attack, saveData.playerDefense),
          playerHp,
        );
    if (playerTurn) {
      bossHp -= damage;
    } else {
      playerHp = Math.max(playerHp - damage, 0);
    }
    turns.push({
      actor: playerTurn ? "player" : "boss",
      target: playerTurn ? "boss" : "player",
      damage,
      bossHpBefore,
      bossHp,
      playerHpBefore,
      playerHp,
    });
    playerTurn = !playerTurn;
  }

  saveData.bossHp = bossHp;
  saveData.playerHp = playerHp;
  const damage = turns
    .filter((turn) => turn.actor === "player")
    .reduce((total, turn) => total + turn.damage, 0);
  const outcome = bossHp === 0 ? "victory" : "defeat";
  if (outcome === "victory") {
    advanceBoss(saveData);
  }
  saveData.lastBattleDate = saveData.currentDate;
  saveSaveData(saveData);

  return res.json({
    ...getGameState(saveData),
    damage,
    turns,
    outcome,
    initialBossHp,
    initialPlayerHp,
    playerMaxHp,
    battleBossHp: bossHp,
    battleBossMaxHp: bossStats.hp,
    canBattle: false,
  });
});

app.post("/api/auto-battle/reset", (req, res) => {
  const saveData = loadSaveData();
  saveData.bossHp = saveData.bossMaxHp;
  saveData.lastBattleDate = null;
  saveData.playerLevel = 1;
  saveData.playerHp = defaultSaveData.playerHp;
  saveData.playerMaxHp = defaultSaveData.playerMaxHp;
  saveData.playerAttack = 1;
  saveData.playerDefense = 1;
  saveSaveData(saveData);
  return res.json({ ...getGameState(saveData), canBattle: true });
});

app.post("/api/god-mode", (req, res) => {
  const saveData = loadSaveData();
  const { action, value } = req.body || {};

  if (action === "advance-day") {
    saveData.currentDate = addDays(saveData.currentDate, 1);
  } else if (action === "kill-boss") {
    advanceBoss(saveData);
  } else if (action === "reset") {
    saveData.bossNumber = defaultSaveData.bossNumber;
    saveData.bossMaxHp = getBossStats(saveData.bossNumber).hp;
    saveData.bossHp = saveData.bossMaxHp;
    saveData.lastBattleDate = null;
    saveData.playerLevel = 1;
    saveData.playerHp = defaultSaveData.playerHp;
    saveData.playerMaxHp = defaultSaveData.playerMaxHp;
    saveData.playerAttack = 1;
    saveData.playerDefense = 1;
    saveData.playerSpeed = 1;
  } else if (action === "change-stat") {
    const { status, delta } = value || {};
    const statKey = `player${status?.[0]?.toUpperCase()}${status?.slice(1)}`;
    if (!["hp", "attack", "defense", "speed"].includes(status)) {
      return res.status(400).json({ message: "不明なステータスです。" });
    }
    if (![1, -1].includes(Number(delta))) {
      return res.status(400).json({ message: "変更値は1または-1です。" });
    }
    saveData[statKey] = Math.max(0, saveData[statKey] + Number(delta));
  } else if (action === "complete-event") {
    saveData.playerLevel += 1;
    saveData.playerHp += 1;
    saveData.playerMaxHp += 1;
    saveData.playerAttack += 1;
    saveData.playerDefense += 1;
    saveData.playerSpeed += 1;
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
  const bossStats = getBossStats(saveData.bossNumber);
  return {
    bossHp: saveData.bossHp,
    bossMaxHp: saveData.bossMaxHp,
    bossNumber: saveData.bossNumber,
    bossAttack: bossStats.attack,
    bossDefense: bossStats.defense,
    bossSpeed: bossStats.speed,
    currentDate: saveData.currentDate,
    playerLevel: saveData.playerLevel,
    playerHp: saveData.playerHp,
    playerMaxHp: saveData.playerMaxHp,
    playerAttack: saveData.playerAttack,
    playerDefense: saveData.playerDefense,
    playerSpeed: saveData.playerSpeed,
  };
}

function getBossStats(bossNumber) {
  const bossIndex = bossNumber - 1;
  return {
    hp: Math.round(200 * 1.5 ** bossIndex),
    attack: 10 + bossIndex * 4,
    defense: 10 + bossIndex * 4,
    speed: 5 + bossIndex * 4,
  };
}

function calculateDamage(attack, defense) {
  const randomCorrection = 0.85 + Math.random() * 0.15;
  return Math.max(Math.floor((attack - defense / 2) * randomCorrection), 1);
}

function advanceBoss(saveData) {
  saveData.bossNumber += 1;
  const nextBossStats = getBossStats(saveData.bossNumber);
  saveData.bossMaxHp = nextBossStats.hp;
  saveData.bossHp = nextBossStats.hp;
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
    const savedBossNumber = Number(saved.bossNumber ?? saved.bossMonth);
    const playerLevel =
      Number.isInteger(saved.playerLevel) && saved.playerLevel >= 1
        ? saved.playerLevel
        : 1;
    const bossNumber = normalizeBossNumber(savedBossNumber, playerLevel);
    if (!Number.isInteger(bossNumber) || bossNumber < 1) {
      return createDefaultSaveData();
    }
    const bossStats = getBossStats(bossNumber);
    const savedBossHp = Number(saved.bossHp);
    return {
      ...defaultSaveData,
      ...saved,
      bossNumber,
      currentDate: saved.currentDate || getToday(),
      playerLevel,
      playerHp: normalizePlayerHp(saved, playerLevel),
      playerMaxHp: normalizePlayerMaxHp(saved, playerLevel),
      playerAttack:
        Number.isFinite(Number(saved.playerAttack)) &&
        Number(saved.playerAttack) >= 0
          ? Math.floor(Number(saved.playerAttack))
          : 1,
      playerDefense:
        Number.isFinite(Number(saved.playerDefense)) &&
        Number(saved.playerDefense) >= 0
          ? Math.floor(Number(saved.playerDefense))
          : 1,
      playerSpeed:
        Number.isFinite(Number(saved.playerSpeed)) &&
        Number(saved.playerSpeed) >= 0
          ? Math.floor(Number(saved.playerSpeed))
          : 1,
      bossMaxHp: bossStats.hp,
      bossHp: Math.min(
        Math.max(Number.isFinite(savedBossHp) ? savedBossHp : bossStats.hp, 0),
        bossStats.hp,
      ),
    };
  } catch {
    return createDefaultSaveData();
  }
}

function normalizeBossNumber(bossNumber, playerLevel) {
  if (!Number.isInteger(bossNumber) || bossNumber < 1) {
    return bossNumber;
  }
  return Math.min(bossNumber, Math.max(playerLevel, 1));
}

function normalizePlayerHp(saved, playerLevel) {
  const savedHp = Math.floor(Number(saved.playerHp));
  if (!Number.isFinite(savedHp) || savedHp < 0) {
    return getMinimumPlayerMaxHp(playerLevel);
  }
  return Math.max(savedHp, getMinimumPlayerHp(playerLevel));
}

function normalizePlayerMaxHp(saved, playerLevel) {
  const savedMaxHp = Math.floor(Number(saved.playerMaxHp));
  const savedHp = Math.floor(Number(saved.playerHp));
  const minimumMaxHp = getMinimumPlayerMaxHp(playerLevel);
  const currentHp =
    Number.isFinite(savedHp) && savedHp >= 0 ? savedHp : minimumMaxHp;
  if (!Number.isFinite(savedMaxHp) || savedMaxHp < 0) {
    return Math.max(currentHp, minimumMaxHp);
  }
  return Math.max(savedMaxHp, currentHp, minimumMaxHp);
}

function getMinimumPlayerHp(playerLevel) {
  return Math.max(1, getMinimumPlayerMaxHp(playerLevel));
}

function getMinimumPlayerMaxHp(playerLevel) {
  return defaultSaveData.playerMaxHp + Math.max(playerLevel - 1, 0);
}

function createDefaultSaveData() {
  return {
    ...defaultSaveData,
    currentDate: getToday(),
  };
}

function saveSaveData(saveData) {
  fs.writeFileSync(saveFile, JSON.stringify(saveData, null, 2));
}

app.listen(port, () => {
  console.log(`Calendar app: http://localhost:${port}`);
});
