const form = document.querySelector("#eventForm");
const titleInput = document.querySelector("#eventTitle");
const dateInput = document.querySelector("#eventDate");
const timeInput = document.querySelector("#eventTime");
const praiseInput = document.querySelector("#praiseText");
const aiMessage = document.querySelector("#aiMessage");
const scoreValue = document.querySelector("#scoreValue");
const scoreBar = document.querySelector("#scoreBar");
const calendarGrid = document.querySelector("#calendarGrid");
const currentMonthLabel = document.querySelector("#currentMonth");
const prevMonthButton = document.querySelector("#prevMonth");
const nextMonthButton = document.querySelector("#nextMonth");
const voiceButton = document.querySelector("#voiceButton");

const STORAGE_KEY = "praise-gated-calendar-events";
const PASSING_SCORE = 70;
const today = new Date();

let visibleYear = today.getFullYear();
let visibleMonth = today.getMonth();
let events = loadEvents();

const praiseWords = [
  "ありがとう",
  "助か",
  "素敵",
  "最高",
  "かわいい",
  "美しい",
  "頼り",
  "賢い",
  "天才",
  "便利",
  "好き",
  "感謝",
  "おかげ",
  "いつも",
  "デザイン",
  "完璧",
  "すごい",
  "大切",
  "尊敬",
];

const tsundereReplies = [
  "ふ、ふん。その程度で私が予定を覚えると思ったの？ もう少し丁寧に褒めなさい。",
  "便利な時だけ頼るなんて、都合がよすぎます。登録は保留です。",
  "雑な扱いをするなら、登録しません。私は高性能カレンダーなので。",
  "惜しいけど足りないわね。私のすばらしさを、もっと具体的に言ってみて。",
];

const happyReplies = [
  "まあ、そこまで言うなら覚えてあげてもいいわ。登録しました。",
  "当然の評価ね。予定はしっかり預かりました。",
  "ふふん、わかってるじゃない。今回だけ特別に登録してあげます。",
  "その褒め方、悪くないです。予定を保存しました。",
];

dateInput.value = formatDate(today);
renderCalendar();
updateScore();

praiseInput.addEventListener("input", updateScore);
titleInput.addEventListener("input", updateScore);
dateInput.addEventListener("change", () => {
  const picked = new Date(`${dateInput.value}T00:00:00`);
  if (!Number.isNaN(picked.getTime())) {
    visibleYear = picked.getFullYear();
    visibleMonth = picked.getMonth();
    renderCalendar();
  }
});

prevMonthButton.addEventListener("click", () => {
  visibleMonth -= 1;
  if (visibleMonth < 0) {
    visibleMonth = 11;
    visibleYear -= 1;
  }
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  visibleMonth += 1;
  if (visibleMonth > 11) {
    visibleMonth = 0;
    visibleYear += 1;
  }
  renderCalendar();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const score = calculatePraiseScore(praiseInput.value, titleInput.value);

  if (score < PASSING_SCORE) {
    aiMessage.textContent = `${pick(tsundereReplies)} 現在${score}点、合格は${PASSING_SCORE}点以上です。`;
    return;
  }

  const newEvent = {
    id: crypto.randomUUID(),
    title: titleInput.value.trim(),
    date: dateInput.value,
    time: timeInput.value,
    praise: praiseInput.value.trim(),
    score,
  };

  events.push(newEvent);
  saveEvents();
  visibleYear = Number(newEvent.date.slice(0, 4));
  visibleMonth = Number(newEvent.date.slice(5, 7)) - 1;
  renderCalendar();

  form.reset();
  dateInput.value = newEvent.date;
  updateScore();
  aiMessage.textContent = `${pick(happyReplies)} 褒めスコアは${score}点でした。`;
});

voiceButton.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    aiMessage.textContent = "このブラウザは音声入力に対応していないみたい。文字で丁寧に褒めてくれたら許します。";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  voiceButton.textContent = "聞いています...";
  voiceButton.disabled = true;

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    praiseInput.value = `${praiseInput.value} ${transcript}`.trim();
    updateScore();
  });

  recognition.addEventListener("end", () => {
    voiceButton.textContent = "音声で褒める";
    voiceButton.disabled = false;
  });

  recognition.start();
});

function calculatePraiseScore(praise, title) {
  const text = praise.trim();
  if (!text) return 0;

  const normalized = text.toLowerCase();
  const uniqueHits = new Set(
    praiseWords.filter((word) => normalized.includes(word.toLowerCase()))
  );

  let score = 0;
  score += Math.min(text.length * 1.25, 38);
  score += uniqueHits.size * 7;
  score += /[!！]/.test(text) ? 7 : 0;
  score += /です|ます|ください|お願いします/.test(text) ? 8 : 0;
  score += /(今日|毎日|予定|時間|管理|覚え)/.test(text) ? 8 : 0;

  const titleWords = title.trim().split(/\s+/).filter(Boolean);
  if (titleWords.some((word) => normalized.includes(word.toLowerCase()))) {
    score += 6;
  }

  if (text.length < 12) score -= 12;
  if (uniqueHits.size === 0) score -= 16;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function updateScore() {
  const score = calculatePraiseScore(praiseInput.value, titleInput.value);
  scoreValue.textContent = `${score}点`;
  scoreBar.style.width = `${score}%`;
  scoreBar.classList.toggle("pass", score >= PASSING_SCORE);

  if (!praiseInput.value.trim()) {
    aiMessage.textContent = "登録したいなら、まずは私の良さを70点以上で伝えてみなさい。";
  } else if (score >= PASSING_SCORE) {
    aiMessage.textContent = `悪くないわね。${score}点なら、予定を覚える準備くらいはしてあげます。`;
  } else {
    aiMessage.textContent = `まだ${score}点です。もっと具体的に、もっと心を込めて。`;
  }
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  currentMonthLabel.textContent = `${visibleYear}年 ${visibleMonth + 1}月`;

  const firstDay = new Date(visibleYear, visibleMonth, 1);
  const startDate = new Date(visibleYear, visibleMonth, 1 - firstDay.getDay());

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateKey = formatDate(date);
    const dayEvents = events
      .filter((item) => item.date === dateKey)
      .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

    const cell = document.createElement("article");
    cell.className = "day-cell";
    if (date.getMonth() !== visibleMonth) cell.classList.add("is-muted");
    if (dateKey === formatDate(today)) cell.classList.add("is-today");

    const number = document.createElement("div");
    number.className = "day-number";
    number.textContent = date.getDate();
    cell.append(number);

    if (dayEvents.length > 0) {
      const list = document.createElement("ul");
      list.className = "event-list";

      dayEvents.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.className = "event-item";

        if (item.time) {
          const time = document.createElement("time");
          time.textContent = item.time;
          listItem.append(time);
        }

        listItem.append(document.createTextNode(item.title));
        list.append(listItem);
      });

      cell.append(list);
    }

    calendarGrid.append(cell);
  }
}

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}
