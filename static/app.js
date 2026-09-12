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
const timeOptions = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30"
];

const scheduleEl = document.getElementById("schedule");
const dateInput = document.getElementById("bookingDate");
const newBookingButton = document.getElementById("newBookingButton");
const bookingDialog = document.getElementById("bookingDialog");
const bookingForm = document.getElementById("bookingForm");
const closeDialogButton = document.getElementById("closeDialogButton");
const deleteBookingButton = document.getElementById("deleteBookingButton");
const dialogTitle = document.getElementById("dialogTitle");
const timeInput = document.getElementById("timeInput");

const formState = {
  editingId: null,
};

function populateTimeOptions(selectedTime = "12:00") {
  timeInput.innerHTML = timeOptions
    .map((time) => `<option value="${time}">${time}</option>`)
    .join("");
  timeInput.value = timeOptions.includes(selectedTime) ? selectedTime : "12:00";
}

function todayIso() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
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
  populateTimeOptions("12:00");
}

function openCreateDialog(dateValue, shiftValue, slotValue) {
  formState.editingId = null;
  bookingForm.reset();
  document.getElementById("dateInput").value = dateValue;
  document.getElementById("shiftInput").value = shiftValue || "morning";
  document.getElementById("slotInput").value = slotValue || "bbp-1";
  document.getElementById("peopleInput").value = 1;
  populateTimeOptions(shiftValue === "afternoon" ? "17:00" : "10:00");
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
  populateTimeOptions(booking.time);
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

function renderSchedule(bookings) {
  const bookingMap = new Map();
  for (const booking of bookings) {
    bookingMap.set(`${booking.shift}-${booking.slot}`, booking);
  }

  const selectedDate = dateInput.value;
  const html = shifts
    .map((shift) => {
      const rows = slotOrder
        .map((slot) => {
          const booking = bookingMap.get(`${shift}-${slot}`);
          if (!booking) {
            return `
              <div class="slot-row">
                <div class="slot-name">${slotLabels[slot]}</div>
                <div class="slot-booking">
                  <div class="empty-slot">Libre</div>
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
                <div class="booking-card">
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
  const payload = {
    name: document.getElementById("nameInput").value,
    date: document.getElementById("dateInput").value,
    shift: document.getElementById("shiftInput").value,
    slot: document.getElementById("slotInput").value,
    time: document.getElementById("timeInput").value,
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
  openCreateDialog(selectedDate, "morning", "bbp-1");
});

closeDialogButton.addEventListener("click", closeDialog);
bookingForm.addEventListener("submit", saveBooking);
deleteBookingButton.addEventListener("click", deleteBooking);
dateInput.addEventListener("change", loadBookingsForSelectedDate);

populateTimeOptions("12:00");
setDate(todayIso());
loadBookingsForSelectedDate();
