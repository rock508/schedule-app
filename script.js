import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlENltF3JMYRkPN9pIhxlwWh8nxK8nR7A",
  authDomain: "suhedule-rpg.firebaseapp.com",
  projectId: "suhedule-rpg",
  storageBucket: "suhedule-rpg.firebasestorage.app",
  messagingSenderId: "812350542170",
  appId: "1:812350542170:web:8325b689720ac353ab6363",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const form = document.querySelector("#eventForm");
const titleInput = document.querySelector("#eventTitle");
const dateInput = document.querySelector("#eventDate");
const timeInput = document.querySelector("#eventTime");
const calendarGrid = document.querySelector("#calendarGrid");
const currentMonth = document.querySelector("#currentMonth");
const closeFormButton = document.querySelector("#closeForm");
const deleteEventButton = document.querySelector("#deleteEvent");
const completeEventButton = document.querySelector("#completeEvent");
const levelUpEffect = document.querySelector("#levelUpEffect");
const statusButton = document.querySelector("#statusButton");
const statusPanel = document.querySelector("#statusPanel");
const statElements = {
  hp: document.querySelector("#statHp"),
  attack: document.querySelector("#statAttack"),
  defense: document.querySelector("#statDefense"),
};
const homeScreen = document.querySelector("#homeScreen");
const homeBgm = document.querySelector("#homeBgm");
const systemDecisionSound = document.querySelector("#systemDecisionSound");
const calendarScreen = document.querySelector("#calendarScreen");
const backHomeButton = document.querySelector("#backHomeButton");
const startScheduleButton = document.querySelector("#startScheduleButton");
const guestPlayButton = document.querySelector("#guestPlayButton");
const autoBattleButton = document.querySelector("#autoBattleButton");
const battlePanel = document.querySelector(".battle-panel");
const playerHpElement = document.querySelector("#playerHp");
const playerHpBar = document.querySelector("#playerHpBar");
const bossHpElement = document.querySelector("#bossHp");
const bossHpBar = document.querySelector("#bossHpBar");
const bossNumberElement = document.querySelector("#bossNumber");
const bossAttackElement = document.querySelector("#bossAttack");
const bossDefenseElement = document.querySelector("#bossDefense");
const bossImage = document.querySelector("#bossImage");
const battleMessage = document.querySelector("#battleMessage");
const battleResetButton = document.querySelector("#battleResetButton");
const godModePanel = document.querySelector("#godModePanel");
const advanceDayButton = document.querySelector("#advanceDayButton");
const killBossButton = document.querySelector("#killBossButton");
const godModeResetButton = document.querySelector("#godModeResetButton");
const godModeMessage = document.querySelector("#godModeMessage");
const godStatElements = {
  hp: document.querySelector("#godStatHp"),
  attack: document.querySelector("#godStatAttack"),
  defense: document.querySelector("#godStatDefense"),
};
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const userProfile = document.querySelector("#userProfile");
const userPhoto = document.querySelector("#userPhoto");
const userName = document.querySelector("#userName");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const volumeControl = document.querySelector("#volumeControl");
const brightnessControl = document.querySelector("#brightnessControl");
const today = new Date();
const storageKey = "calendar-events";
const settingsStorageKey = "schedule-settings";
const statsStorageKey = "schedule-stats";

let displayedDate = new Date(today.getFullYear(), today.getMonth(), 1);
let events = loadEvents();
let editingEventIndex = null;
let battleDone = false;
let battleInProgress = false;
let currentBossNumber = 1;
let stats = loadStats();
const savedSettings = loadSettings();

const battleTurnDelay = 3000;

renderStats();

volumeControl.value = savedSettings.volume;
homeBgm.volume = savedSettings.volume / 100;
systemDecisionSound.volume = savedSettings.volume / 100;
brightnessControl.value = savedSettings.brightness;
document.body.style.setProperty("--brightness", savedSettings.brightness / 100);

function playSystemDecisionSound() {
  systemDecisionSound.currentTime = 0;
  systemDecisionSound.play().catch(() => {});
}

document.addEventListener("click", (event) => {
  if (event.target.closest("button")) playSystemDecisionSound();
});

function playHomeBgm() {
  homeBgm.play().catch(() => {
    // ブラウザの自動再生制限中は、次のユーザー操作で再試行します。
  });
}

function stopHomeBgm() {
  homeBgm.pause();
  homeBgm.currentTime = 0;
}

playHomeBgm();
homeScreen.addEventListener("pointerdown", playHomeBgm, true);

statusButton.addEventListener("click", () => {
  const isHidden = statusPanel.hidden;
  statusPanel.hidden = !isHidden;
  statusButton.setAttribute("aria-expanded", String(isHidden));
});

function openCalendar() {
  stopHomeBgm();
  homeScreen.hidden = true;
  calendarScreen.hidden = false;
  loadBattleStatus();
}

function openHome() {
  calendarScreen.hidden = true;
  homeScreen.hidden = false;
  playHomeBgm();
}

startScheduleButton.addEventListener("click", openCalendar);
guestPlayButton.addEventListener("click", openCalendar);
backHomeButton.addEventListener("click", openHome);

autoBattleButton.addEventListener("click", async () => {
  if (battleInProgress) return;
  battleInProgress = true;
  autoBattleButton.disabled = true;
  battleResetButton.disabled = true;
  battlePanel.classList.remove("battle-victory", "battle-defeat");
  battleMessage.textContent = "戦闘開始。先攻で攻撃します...";
  try {
    const response = await fetch("/api/auto-battle", {
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok) {
      battleMessage.textContent = result.message;
      return;
    }
    const battleState = createBattleState(result);
    updateBossHp(battleState.bossHp, battleState.bossMaxHp);
    updatePlayerHp(battleState.playerHp, battleState.playerMaxHp);
    for (const [index, turn] of result.turns.entries()) {
      if (index > 0) await waitForBattleTurn();
      applyBattleTurn(turn, battleState);
      battleMessage.textContent = getBattleTurnMessage(turn);
    }
    await waitForBattleTurn();
    updateBossHp(
      result.battleBossHp ?? battleState.bossHp,
      battleState.bossMaxHp,
    );
    updatePlayerHp(
      result.playerHp ?? battleState.playerHp,
      battleState.playerMaxHp,
    );
    battleDone = true;
    battlePanel.classList.add(
      result.outcome === "victory" ? "battle-victory" : "battle-defeat",
    );
    battleMessage.textContent =
      result.outcome === "victory"
        ? `勝利！ ${result.damage}ダメージを与えました。`
        : "敗北... 自分のHPが0になりました。今日は戦闘終了です。";
  } catch {
    battleMessage.textContent =
      "セーブに失敗しました。もう一度お試しください。";
  } finally {
    battleInProgress = false;
    autoBattleButton.disabled = battleDone;
    battleResetButton.disabled = false;
  }
});

function waitForBattleTurn() {
  return new Promise((resolve) => setTimeout(resolve, battleTurnDelay));
}

function createBattleState(result) {
  return {
    bossHp: result.initialBossHp ?? result.bossHp ?? 0,
    bossMaxHp: result.battleBossMaxHp ?? result.bossMaxHp ?? 1,
    playerHp: result.initialPlayerHp ?? result.playerHp ?? 0,
    playerMaxHp:
      result.playerMaxHp ?? result.initialPlayerHp ?? result.playerHp ?? 1,
  };
}

function applyBattleTurn(turn, battleState) {
  if (turn.target === "boss" || turn.actor === "player") {
    battleState.bossHp = turn.bossHp ?? battleState.bossHp;
  } else {
    battleState.playerHp = turn.playerHp ?? battleState.playerHp;
  }
  updateBossHp(battleState.bossHp, battleState.bossMaxHp);
  updatePlayerHp(battleState.playerHp, battleState.playerMaxHp);
}

function getBattleTurnMessage(turn) {
  if (turn.target === "boss") {
    return `自分の攻撃！ 相手に${turn.damage}ダメージ！`;
  }
  if (turn.damage === 0) {
    return "相手の攻撃！ 自分が1ダメージを受けました。";
  }
  return `相手の攻撃！ 自分が${turn.damage}ダメージを受けました。`;
}

async function loadBattleStatus() {
  try {
    battlePanel.classList.remove("battle-victory", "battle-defeat");
    const response = await fetch("/api/auto-battle");
    const result = await response.json();
    updateBossStatus(result);
    battleDone = !result.canBattle;
    autoBattleButton.disabled = battleDone;
    battleMessage.textContent = result.canBattle
      ? "今日はまだ戦えます。"
      : "今日は戦闘済みです。明日また戦えます。";
  } catch {
    bossHpElement.textContent = "取得できません";
    battleMessage.textContent = "セーブデータを取得できません。";
  }
}

battleResetButton.addEventListener("click", async () => {
  if (battleInProgress) return;
  godModePanel.hidden = !godModePanel.hidden;
});

advanceDayButton.addEventListener("click", () =>
  runGodModeAction("advance-day"),
);
killBossButton.addEventListener("click", () => runGodModeAction("kill-boss"));
godModeResetButton.addEventListener("click", () => runGodModeAction("reset"));
document.querySelectorAll(".god-stat-row button").forEach((button) => {
  button.addEventListener("click", () =>
    runGodModeAction("change-stat", {
      status: button.dataset.status,
      delta: Number(button.dataset.delta),
    }),
  );
});

async function runGodModeAction(action, value = null) {
  godModeMessage.textContent = "処理中...";
  const controls = [
    advanceDayButton,
    killBossButton,
    godModeResetButton,
    ...document.querySelectorAll(".god-stat-row button"),
  ];
  controls.forEach((control) => {
    control.disabled = true;
  });
  try {
    const response = await fetch("/api/god-mode", {
      body: JSON.stringify({ action, value }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    updateGameState(result.gameState);
    battleDone = !result.canBattle;
    autoBattleButton.disabled = battleDone;
    godModeMessage.textContent = "ゲーム状態を更新しました。";
  } catch (error) {
    godModeMessage.textContent = error.message || "更新に失敗しました。";
  } finally {
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function updateBossHp(bossHp, bossMaxHp) {
  bossHpElement.textContent = `${bossHp} / ${bossMaxHp}`;
  bossHpBar.max = bossMaxHp;
  bossHpBar.value = bossHp;
}

function updatePlayerHp(playerHp = stats.hp, playerMaxHp = stats.hp) {
  playerHpElement.textContent = `${playerHp} / ${playerMaxHp}`;
  playerHpBar.max = playerMaxHp;
  playerHpBar.value = playerHp;
}

function updateBossStatus(result) {
  updateBossHp(result.bossHp, result.bossMaxHp);
  bossNumberElement.textContent = result.bossNumber;
  bossAttackElement.textContent = result.bossAttack;
  bossDefenseElement.textContent = result.bossDefense;
  updateBossImage(result.bossNumber);
  updatePlayerStatus(result);
}

function updateGameState(gameState) {
  updateBossStatus(gameState);
  if (gameState.currentDate) {
    displayedDate = new Date(`${gameState.currentDate}T00:00:00`);
    dateInput.value = gameState.currentDate;
    renderCalendar();
  }
}

function updatePlayerStatus(gameState) {
  Object.entries(godStatElements).forEach(([stat, element]) => {
    element.textContent =
      gameState[`player${stat[0].toUpperCase()}${stat.slice(1)}`];
  });
  statElements.hp.textContent = gameState.playerHp;
  statElements.attack.textContent = gameState.playerAttack;
  statElements.defense.textContent = gameState.playerDefense;
  updatePlayerHp(
    gameState.playerHp,
    gameState.playerMaxHp ?? gameState.playerHp,
  );
}

function updateBossImage(bossNumber = currentBossNumber) {
  currentBossNumber = bossNumber;
  const imageNumber = ((bossNumber - 1) % 12) + 1;
  const imageName = String(imageNumber).padStart(1, "0");
  const fullWidthImageNumber = imageName.replace(/[0-9]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) + 0xfee0),
  );
  bossImage.src = `敵キャラ/${fullWidthImageNumber}.png`;
  bossImage.alt = `第${bossNumber}体目のボス`;
}

loginButton.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("ログインユーザー:", result.user.displayName);
  } catch (error) {
    console.error("Googleログインに失敗しました:", error);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("ログアウトに失敗しました:", error);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginButton.hidden = true;
    logoutButton.hidden = false;
    userName.textContent = user.displayName || user.email || "Googleユーザー";
    userPhoto.src = user.photoURL || "";
    userProfile.hidden = false;
    console.log("ログインユーザー:", user.displayName);
    return;
  }
  loginButton.hidden = false;
  logoutButton.hidden = true;
  userName.textContent = "";
  userPhoto.removeAttribute("src");
  userProfile.hidden = true;
});

settingsButton.addEventListener("click", () => {
  settingsPanel.hidden = false;
});

closeSettingsButton.addEventListener("click", () => {
  settingsPanel.hidden = true;
});

volumeControl.addEventListener("input", () => {
  homeBgm.volume = volumeControl.value / 100;
  systemDecisionSound.volume = volumeControl.value / 100;
  saveSettings();
});
brightnessControl.addEventListener("input", () => {
  document.body.style.setProperty(
    "--brightness",
    brightnessControl.value / 100,
  );
  saveSettings();
});

dateInput.value = formatDate(today);
renderCalendar();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const eventData = {
    title: titleInput.value.trim(),
    date: dateInput.value,
    time: timeInput.value,
  };
  if (editingEventIndex === null) {
    events.push(eventData);
  } else {
    events[editingEventIndex] = eventData;
  }
  localStorage.setItem(storageKey, JSON.stringify(events));
  displayedDate = new Date(`${dateInput.value}T00:00:00`);
  form.reset();
  dateInput.value = formatDate(today);
  form.hidden = true;
  editingEventIndex = null;
  deleteEventButton.hidden = true;
  completeEventButton.hidden = true;
  renderCalendar();
});

closeFormButton.addEventListener("click", () => {
  form.hidden = true;
  editingEventIndex = null;
  deleteEventButton.hidden = true;
  completeEventButton.hidden = true;
});

deleteEventButton.addEventListener("click", () => {
  if (editingEventIndex === null) return;
  events.splice(editingEventIndex, 1);
  localStorage.setItem(storageKey, JSON.stringify(events));
  form.hidden = true;
  editingEventIndex = null;
  deleteEventButton.hidden = true;
  completeEventButton.hidden = true;
  renderCalendar();
});

completeEventButton.addEventListener("click", async () => {
  if (editingEventIndex === null) return;
  completeEventButton.disabled = true;
  try {
    const response = await fetch("/api/god-mode", {
      body: JSON.stringify({ action: "complete-event" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    updateGameState(result.gameState);
    battleDone = !result.canBattle;
    autoBattleButton.disabled = battleDone;
  } catch (error) {
    battleMessage.textContent = error.message || "予定の完了に失敗しました。";
    completeEventButton.disabled = false;
    return;
  }
  events.splice(editingEventIndex, 1);
  localStorage.setItem(storageKey, JSON.stringify(events));
  form.hidden = true;
  editingEventIndex = null;
  deleteEventButton.hidden = true;
  completeEventButton.hidden = true;
  completeEventButton.disabled = false;
  statusPanel.hidden = false;
  statusButton.setAttribute("aria-expanded", "true");
  statusPanel.classList.remove("stats-increased");
  statusButton.classList.remove("stats-increased");
  levelUpEffect.hidden = false;
  levelUpEffect.classList.remove("level-up-show");
  requestAnimationFrame(() => {
    statusPanel.classList.add("stats-increased");
    statusButton.classList.add("stats-increased");
    levelUpEffect.classList.add("level-up-show");
  });
  renderCalendar();
});

dateInput.addEventListener("change", () => {
  displayedDate = new Date(`${dateInput.value}T00:00:00`);
  renderCalendar();
});

document.querySelector("#previousMonth").addEventListener("click", () => {
  displayedDate.setMonth(displayedDate.getMonth() - 1);
  renderCalendar();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  displayedDate.setMonth(displayedDate.getMonth() + 1);
  renderCalendar();
});

function renderCalendar() {
  const year = displayedDate.getFullYear();
  const month = displayedDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstCell = new Date(year, month, 1 - firstDay.getDay());

  currentMonth.textContent = `${year}年${month + 1}月`;
  updateBossImage();
  calendarGrid.replaceChildren();

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    const dateKey = formatDate(date);
    const cell = document.createElement("article");
    cell.className = "day";

    if (date.getMonth() !== month || date.getFullYear() !== year) {
      cell.classList.add("empty");
      cell.setAttribute("aria-hidden", "true");
      calendarGrid.append(cell);
      continue;
    }

    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.setAttribute("aria-label", `${dateKey}の予定を追加`);
    cell.addEventListener("click", () => openFormForDate(dateKey));
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFormForDate(dateKey);
      }
    });
    if (dateKey === formatDate(today)) cell.classList.add("today");

    const weekday = document.createElement("div");
    weekday.className = "weekday";
    weekday.textContent = ["日", "月", "火", "水", "木", "金", "土"][
      date.getDay()
    ];
    cell.append(weekday);

    const number = document.createElement("div");
    number.className = "day-number";
    number.textContent = date.getDate();
    cell.append(number);

    if (dateKey === formatDate(today)) {
      const avatar = document.createElement("img");
      avatar.className = "avatar-image";
      avatar.src = "画像倉庫/image.png";
      avatar.alt = "今日のアバター";
      cell.append(avatar);
    }

    events
      .filter((item) => item.date === dateKey)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
      .forEach((item) => {
        const eventElement = document.createElement("div");
        eventElement.className = "event";
        eventElement.tabIndex = 0;
        eventElement.setAttribute("role", "button");
        eventElement.setAttribute("aria-label", `${item.title}を編集`);
        eventElement.textContent = item.time
          ? `${item.time} ${item.title}`
          : item.title;
        const eventIndex = events.indexOf(item);
        eventElement.addEventListener("click", (event) => {
          event.stopPropagation();
          openFormForEvent(eventIndex);
        });
        eventElement.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            openFormForEvent(eventIndex);
          }
        });
        cell.append(eventElement);
      });

    calendarGrid.append(cell);
  }
}

function openFormForDate(dateKey) {
  editingEventIndex = null;
  deleteEventButton.hidden = true;
  completeEventButton.hidden = true;
  levelUpEffect.hidden = true;
  titleInput.value = "";
  timeInput.value = "";
  dateInput.value = dateKey;
  displayedDate = new Date(`${dateKey}T00:00:00`);
  form.hidden = false;
  renderCalendar();
  titleInput.focus();
}

function openFormForEvent(eventIndex) {
  const item = events[eventIndex];
  if (!item) return;
  editingEventIndex = eventIndex;
  titleInput.value = item.title;
  dateInput.value = item.date;
  timeInput.value = item.time || "";
  form.hidden = false;
  deleteEventButton.hidden = false;
  completeEventButton.hidden = false;
  levelUpEffect.hidden = true;
  displayedDate = new Date(`${item.date}T00:00:00`);
  renderCalendar();
  titleInput.focus();
}

function renderStats() {
  Object.entries(stats).forEach(([stat, value]) => {
    const element = statElements[stat];
    if (!element) return;
    element.textContent = value;
  });
}

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsStorageKey));
    return {
      volume: saved?.volume ?? 70,
      brightness: saved?.brightness ?? 100,
    };
  } catch {
    return { volume: 70, brightness: 100 };
  }
}

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(statsStorageKey));
    return {
      hp: saved?.hp ?? 1,
      attack: saved?.attack ?? 1,
      defense: saved?.defense ?? 1,
    };
  } catch {
    return { hp: 1, attack: 1, defense: 1 };
  }
}

function saveSettings() {
  localStorage.setItem(
    settingsStorageKey,
    JSON.stringify({
      volume: volumeControl.value,
      brightness: brightnessControl.value,
    }),
  );
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
