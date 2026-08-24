const form = document.querySelector("#eventForm");
const titleInput = document.querySelector("#eventTitle");
const dateInput = document.querySelector("#eventDate");
const timeInput = document.querySelector("#eventTime");
const calendarGrid = document.querySelector("#calendarGrid");
const currentMonth = document.querySelector("#currentMonth");
const closeFormButton = document.querySelector("#closeForm");
const deleteEventButton = document.querySelector("#deleteEvent");
const statusButton = document.querySelector("#statusButton");
const statusPanel = document.querySelector("#statusPanel");
const today = new Date();
const storageKey = "calendar-events";

let displayedDate = new Date(today.getFullYear(), today.getMonth(), 1);
let events = loadEvents();
let editingEventIndex = null;

statusButton.addEventListener("click", () => {
  const isHidden = statusPanel.hidden;
  statusPanel.hidden = !isHidden;
  statusButton.setAttribute("aria-expanded", String(isHidden));
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
  renderCalendar();
});

closeFormButton.addEventListener("click", () => {
  form.hidden = true;
  editingEventIndex = null;
  deleteEventButton.hidden = true;
});

deleteEventButton.addEventListener("click", () => {
  if (editingEventIndex === null) return;
  events.splice(editingEventIndex, 1);
  localStorage.setItem(storageKey, JSON.stringify(events));
  form.hidden = true;
  editingEventIndex = null;
  deleteEventButton.hidden = true;
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
  displayedDate = new Date(`${item.date}T00:00:00`);
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
