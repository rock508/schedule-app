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
  speed: document.querySelector("#statSpeed"),
};
const homeScreen = document.querySelector("#homeScreen");
const calendarScreen = document.querySelector("#calendarScreen");
const backHomeButton = document.querySelector("#backHomeButton");
const startScheduleButton = document.querySelector("#startScheduleButton");
const guestPlayButton = document.querySelector("#guestPlayButton");
const autoBattleButton = document.querySelector("#autoBattleButton");
const bossHpElement = document.querySelector("#bossHp");
const bossHpBar = document.querySelector("#bossHpBar");
const bossMonthElement = document.querySelector("#bossMonth");
const bossAttackElement = document.querySelector("#bossAttack");
const bossDefenseElement = document.querySelector("#bossDefense");
const bossSpeedElement = document.querySelector("#bossSpeed");
const bossImage = document.querySelector("#bossImage");
const battleMessage = document.querySelector("#battleMessage");
const battleResetButton = document.querySelector("#battleResetButton");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const loginPanel = document.querySelector("#loginPanel");
const confirmLoginButton = document.querySelector("#confirmLoginButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const volumeControl = document.querySelector("#volumeControl");
const brightnessControl = document.querySelector("#brightnessControl");
const today = new Date();
const storageKey = "calendar-events";
const accountStorageKey = "schedule-account";
const settingsStorageKey = "schedule-settings";
const statsStorageKey = "schedule-stats";

let displayedDate = new Date(today.getFullYear(), today.getMonth(), 1);
let events = loadEvents();
let editingEventIndex = null;
let battleDone = false;
let stats = loadStats();
const savedSettings = loadSettings();

renderStats();

volumeControl.value = savedSettings.volume;
brightnessControl.value = savedSettings.brightness;
document.body.style.setProperty("--brightness", savedSettings.brightness / 100);

statusButton.addEventListener("click", () => {
  const isHidden = statusPanel.hidden;
  statusPanel.hidden = !isHidden;
  statusButton.setAttribute("aria-expanded", String(isHidden));
});

function openCalendar() {
  homeScreen.hidden = true;
  calendarScreen.hidden = false;
  loadBattleStatus();
}

function openHome() {
  calendarScreen.hidden = true;
  homeScreen.hidden = false;
}

startScheduleButton.addEventListener("click", openCalendar);
guestPlayButton.addEventListener("click", openCalendar);
backHomeButton.addEventListener("click", openHome);

autoBattleButton.addEventListener("click", async () => {
  autoBattleButton.disabled = true;
  battleMessage.textContent = "戦闘中...";
  try {
    const response = await fetch("/api/auto-battle", { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      battleMessage.textContent = result.message;
      return;
    }
    updateBossStatus(result);
    battleDone = true;
    battleMessage.textContent = `${result.damage}ダメージを与えました。今日は戦闘終了です。`;
  } catch {
    battleMessage.textContent =
      "セーブに失敗しました。もう一度お試しください。";
    autoBattleButton.disabled = false;
  }
});

async function loadBattleStatus() {
  try {
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
  battleResetButton.disabled = true;
  try {
    const response = await fetch("/api/auto-battle/reset", { method: "POST" });
    if (!response.ok) throw new Error("reset failed");
    const result = await response.json();
    battleDone = false;
    updateBossStatus(result);
    autoBattleButton.disabled = false;
    battleMessage.textContent = "未戦闘・HP満タンにリセットしました。";
  } catch {
    battleMessage.textContent = "戦闘リセットに失敗しました。";
  } finally {
    battleResetButton.disabled = false;
  }
});

function updateBossHp(bossHp, bossMaxHp) {
  bossHpElement.textContent = `${bossHp} / ${bossMaxHp}`;
  bossHpBar.max = bossMaxHp;
  bossHpBar.value = bossHp;
}

function updateBossStatus(result) {
  updateBossHp(result.bossHp, result.bossMaxHp);
  bossMonthElement.textContent = result.bossMonth;
  bossAttackElement.textContent = result.bossAttack;
  bossDefenseElement.textContent = result.bossDefense;
  bossSpeedElement.textContent = result.bossSpeed;
  updateBossImage(result.bossMonth);
}

function updateBossImage(bossMonth = displayedDate.getMonth() + 1) {
  const enemyImages = {
    8: "敵キャラ/８月.png",
    9: "敵キャラ/９月.png",
  };
  const imagePath = enemyImages[bossMonth] || enemyImages[8];
  bossImage.src = imagePath;
  bossImage.alt = `${bossMonth}月の敵キャラ`;
}

loginButton.addEventListener("click", () => {
  loginPanel.hidden = false;
});

confirmLoginButton.addEventListener("click", () => {
  if (!document.querySelector("#loginPassword").value) return;
  localStorage.setItem(accountStorageKey, "logged-in");
  loginPanel.hidden = true;
  document.querySelector("#loginPassword").value = "";
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(accountStorageKey);
  loginPanel.hidden = true;
});

settingsButton.addEventListener("click", () => {
  settingsPanel.hidden = false;
});

closeSettingsButton.addEventListener("click", () => {
  settingsPanel.hidden = true;
});

volumeControl.addEventListener("input", saveSettings);
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

completeEventButton.addEventListener("click", () => {
  if (editingEventIndex === null) return;
  events.splice(editingEventIndex, 1);
  localStorage.setItem(storageKey, JSON.stringify(events));
  Object.keys(stats).forEach((stat) => {
    stats[stat] += 1;
  });
  localStorage.setItem(statsStorageKey, JSON.stringify(stats));
  renderStats();
  form.hidden = true;
  editingEventIndex = null;
  deleteEventButton.hidden = true;
  completeEventButton.hidden = true;
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
  Object.entries(statElements).forEach(([stat, element]) => {
    element.textContent = stats[stat];
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
      speed: saved?.speed ?? 1,
    };
  } catch {
    return { hp: 1, attack: 1, defense: 1, speed: 1 };
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
