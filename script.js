const form = document.querySelector("#eventForm");
const titleInput = document.querySelector("#eventTitle");
const dateInput = document.querySelector("#eventDate");
const timeInput = document.querySelector("#eventTime");
const calendarGrid = document.querySelector("#calendarGrid");
const currentMonth = document.querySelector("#currentMonth");
const closeFormButton = document.querySelector("#closeForm");
const homeScreen = document.querySelector("#homeScreen");
const calendarScreen = document.querySelector("#calendarScreen");
const startScheduleButton = document.querySelector("#startScheduleButton");
const guestPlayButton = document.querySelector("#guestPlayButton");
const today = new Date();
const storageKey = "calendar-events";

let displayedDate = new Date(today.getFullYear(), today.getMonth(), 1);
let events = loadEvents();

dateInput.value = formatDate(today);
renderCalendar();

function openCalendar() {
  homeScreen.hidden = true;
  calendarScreen.hidden = false;
}

startScheduleButton.addEventListener("click", openCalendar);
guestPlayButton.addEventListener("click", openCalendar);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  events.push({
    title: titleInput.value.trim(),
    date: dateInput.value,
    time: timeInput.value,
  });
  localStorage.setItem(storageKey, JSON.stringify(events));
  displayedDate = new Date(`${dateInput.value}T00:00:00`);
  form.reset();
  dateInput.value = formatDate(today);
  form.hidden = true;
  renderCalendar();
});

closeFormButton.addEventListener("click", () => {
  form.hidden = true;
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
        eventElement.textContent = item.time
          ? `${item.time} ${item.title}`
          : item.title;
        cell.append(eventElement);
      });

    calendarGrid.append(cell);
  }
}

function openFormForDate(dateKey) {
  dateInput.value = dateKey;
  displayedDate = new Date(`${dateKey}T00:00:00`);
  form.hidden = false;
  renderCalendar();
  titleInput.focus();
}

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
