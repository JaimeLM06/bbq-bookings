const shifts = ["morning", "afternoon"];
const slotOrder = ["bbp-1", "bbp-2", "bbm-1", "bbm-2", "bbg-1", "bbg-2"];
const slotLabels = {
  "bbp-1": "bbp 1",
  "bbp-2": "bbp 2",
  "bbm-1": "bbm 1",
  "bbm-2": "bbm 2",
  "bbg-1": "bbg 1",
  "bbg-2": "bbg 2",
};
const shiftLabels = {
  morning: "Mañana",
  afternoon: "Tarde",
};
const afternoonStart = "18:00";
const morningStart = "05:00";
const morningEnd = "17:55";
const afternoonEnd = "23:55";
const shiftTimeError = "A partir de las 18:00 la barbacoa pertenece al turno de tarde. Las horas anteriores pertenecen al turno de mañana.";

const scheduleEl = document.getElementById("schedule");
const dateInput = document.getElementById("bookingDate");
const shiftSelection = document.getElementById("shiftSelection");
const newBookingButton = document.getElementById("newBookingButton");
const bookingDialog = document.getElementById("bookingDialog");
const bookingForm = document.getElementById("bookingForm");
const closeDialogButton = document.getElementById("closeDialogButton");
const deleteBookingButton = document.getElementById("deleteBookingButton");
const dialogTitle = document.getElementById("dialogTitle");
const hourInput = document.getElementById("hourInput");
const minuteInput = document.getElementById("minuteInput");
const shiftInput = document.getElementById("shiftInput");

const formState = {
  editingId: null,
};
const appState = {
  activeShift: "morning",
};

function configureTimePicker(selectedTime = "12:00", shift = shiftInput.value) {
  const startTime = shift === "afternoon" ? afternoonStart : morningStart;
  const endTime = shift === "afternoon" ? afternoonEnd : morningEnd;
  const startHour = Number(startTime.slice(0, 2));
  const endHour = Number(endTime.slice(0, 2));
  const [selectedHour, selectedMinute] = selectedTime.split(":");
  const isInRange = selectedTime >= startTime && selectedTime <= endTime
    && Number(selectedMinute) % 5 === 0;
  const defaultTime = shift === "afternoon" ? afternoonStart : "12:00";
  const [defaultHour, defaultMinute] = isInRange
    ? [selectedHour, selectedMinute]
    : defaultTime.split(":");

  hourInput.innerHTML = Array.from({ length: endHour - startHour + 1 }, (_, index) => {
    const hour = String(startHour + index).padStart(2, "0");
    return `<option value="${hour}">${hour}</option>`;
  }).join("");
  minuteInput.innerHTML = Array.from({ length: 12 }, (_, index) => {
    const minute = String(index * 5).padStart(2, "0");
    return `<option value="${minute}">${minute}</option>`;
  }).join("");

  hourInput.value = defaultHour;
  minuteInput.value = defaultMinute;
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setDate(dateValue) {
  const realDate = dateValue || todayIso();
  dateInput.value = realDate;
  return realDate;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showDialog() {
  bookingDialog.showModal();
}

function closeDialog() {
  bookingDialog.close();
  bookingForm.reset();
  formState.editingId = null;
  deleteBookingButton.classList.add("hidden");
  dialogTitle.textContent = "Nueva reserva";
  document.getElementById("peopleInput").value = 1;
  configureTimePicker("12:00", "morning");
}

function openCreateDialog(dateValue, shiftValue, slotValue) {
  formState.editingId = null;
  bookingForm.reset();
  document.getElementById("dateInput").value = dateValue;
  document.getElementById("shiftInput").value = shiftValue || "morning";
  document.getElementById("slotInput").value = slotValue || "bbp-1";
  document.getElementById("peopleInput").value = 1;
  configureTimePicker(shiftValue === "afternoon" ? "18:00" : "10:00", shiftValue || "morning");
  deleteBookingButton.classList.add("hidden");
  dialogTitle.textContent = "Nueva reserva";
  showDialog();
}

function openEditDialog(booking) {
  formState.editingId = booking.id;
  document.getElementById("nameInput").value = booking.name;
  document.getElementById("dateInput").value = booking.date;
  document.getElementById("shiftInput").value = booking.shift;
  document.getElementById("slotInput").value = booking.slot;
  configureTimePicker(booking.time, booking.shift);
  document.getElementById("peopleInput").value = booking.people;
  deleteBookingButton.classList.remove("hidden");
  dialogTitle.textContent = "Editar reserva";
  showDialog();
}

async function fetchBookings(dateValue) {
  const response = await fetch(`/api/bookings?date=${encodeURIComponent(dateValue)}`);
  if (!response.ok) {
    throw new Error("No se pudieron cargar las reservas.");
  }
  return response.json();
}

function updateShiftButtons() {
  document.querySelectorAll(".shift-choice").forEach((button) => {
    const isActive = button.dataset.shift === appState.activeShift;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setActiveShift(shift) {
  if (!shifts.includes(shift)) {
    return;
  }

  appState.activeShift = shift;
  updateShiftButtons();
  loadBookingsForSelectedDate();
}

function renderSchedule(bookings) {
  const activeShift = appState.activeShift;
  const bookingMap = new Map();
  for (const booking of bookings) {
    if (booking.shift === activeShift) {
      bookingMap.set(`${booking.shift}-${booking.slot}`, booking);
    }
  }

  const selectedDate = dateInput.value;
  const html = [activeShift]
    .map((shift) => {
      const rows = slotOrder
        .map((slot) => {
          const booking = bookingMap.get(`${shift}-${slot}`);
          if (!booking) {
            return `
              <div class="slot-row">
                <div class="slot-name">${slotLabels[slot]}</div>
                <div class="slot-booking">
                  <div class="empty-slot free-slot">Libre</div>
                  <div class="slot-actions">
                    <button class="secondary-button" data-create="${shift}|${slot}|${selectedDate}">Añadir</button>
                  </div>
                </div>
              </div>
            `;
          }

          return `
            <div class="slot-row">
              <div class="slot-name">${slotLabels[slot]}</div>
              <div class="slot-booking">
                <div class="booking-card filled-slot">
                  <strong>${escapeHtml(booking.name)}</strong>
                  <div class="booking-meta">${escapeHtml(booking.time)} · ${escapeHtml(String(booking.people))} personas</div>
                </div>
                <div class="slot-actions">
                  <button class="secondary-button" data-edit="${booking.id}">Editar</button>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <section class="shift-panel">
          <div class="shift-header">${shiftLabels[shift]}</div>
          <div class="slot-list">${rows}</div>
        </section>
      `;
    })
    .join("");

  scheduleEl.innerHTML = html;

  scheduleEl.querySelectorAll("[data-create]").forEach((button) => {
    button.addEventListener("click", () => {
      const [shiftValue, slotValue, dateValue] = button.dataset.create.split("|");
      openCreateDialog(dateValue, shiftValue, slotValue);
    });
  });

  scheduleEl.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const bookingId = Number(button.dataset.edit);
      const bookingsForDate = await fetchBookings(dateInput.value);
      const booking = bookingsForDate.find((item) => item.id === bookingId);
      if (booking) {
        openEditDialog(booking);
      }
    });
  });
}

async function loadBookingsForSelectedDate() {
  try {
    const dateValue = setDate(dateInput.value || todayIso());
    const bookings = await fetchBookings(dateValue);
    renderSchedule(bookings);
  } catch (error) {
    console.error(error);
    scheduleEl.innerHTML = "<p>No se pudieron cargar las reservas.</p>";
  }
}

async function saveBooking(event) {
  event.preventDefault();
  const shift = document.getElementById("shiftInput").value;
  const time = `${hourInput.value}:${minuteInput.value}`;
  const isInvalidTime = !/^\d{2}:\d{2}$/.test(time)
    || Number(time.slice(3)) % 5 !== 0
    || time < morningStart
    || time > afternoonEnd
    || (shift === "morning" && time > morningEnd)
    || (shift === "afternoon" && time < afternoonStart);
  const isInvalidShiftTime = (shift === "afternoon" && time < afternoonStart)
    || (shift === "morning" && time >= afternoonStart);

  if (isInvalidTime) {
    alert("La hora debe estar entre las 05:00 y las 23:55, en intervalos de 5 minutos.");
    return;
  }

  if (isInvalidShiftTime) {
    alert(shiftTimeError);
    return;
  }

  const payload = {
    name: document.getElementById("nameInput").value,
    date: document.getElementById("dateInput").value,
    shift,
    slot: document.getElementById("slotInput").value,
    time,
    people: Number(document.getElementById("peopleInput").value),
  };

  const method = formState.editingId ? "PUT" : "POST";
  const url = formState.editingId ? `/api/bookings/${formState.editingId}` : "/api/bookings";

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    alert(err.error || "No se pudo guardar la reserva.");
    return;
  }

  closeDialog();
  await loadBookingsForSelectedDate();
}

async function deleteBooking() {
  if (!formState.editingId) {
    return;
  }

  const confirmation = window.confirm("¿Eliminar esta reserva de barbacoa?");
  if (!confirmation) {
    return;
  }

  const response = await fetch(`/api/bookings/${formState.editingId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const err = await response.json();
    alert(err.error || "No se pudo eliminar la reserva.");
    return;
  }

  closeDialog();
  await loadBookingsForSelectedDate();
}

newBookingButton.addEventListener("click", () => {
  const selectedDate = dateInput.value || todayIso();
  openCreateDialog(selectedDate, appState.activeShift, "bbp-1");
});

closeDialogButton.addEventListener("click", closeDialog);
bookingForm.addEventListener("submit", saveBooking);
deleteBookingButton.addEventListener("click", deleteBooking);
dateInput.addEventListener("change", loadBookingsForSelectedDate);
shiftSelection.addEventListener("click", (event) => {
  const button = event.target.closest(".shift-choice");
  if (!button) {
    return;
  }

  setActiveShift(button.dataset.shift);
});
shiftInput.addEventListener("change", () => configureTimePicker(`${hourInput.value}:${minuteInput.value}`, shiftInput.value));

updateShiftButtons();
configureTimePicker("12:00", "morning");
setDate(todayIso());
loadBookingsForSelectedDate();
