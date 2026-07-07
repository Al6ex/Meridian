const STORAGE_KEY = "meridian-orders-v3";

const apartments = [
  {
    id: "wohnung-1",
    name: "Altstadt Loft",
    rooms: "2 Zimmer · 58 m² · bis 4 Gäste",
    price: 145,
    status: "Bereit",
    imageClass: "image-loft",
    description: "Zentrale Wohnung mit heller Küche, Arbeitsplatz und kurzem Weg zur Innenstadt.",
  },
  {
    id: "wohnung-2",
    name: "Rheinblick Suite",
    rooms: "3 Zimmer · 74 m² · bis 6 Gäste",
    price: 190,
    status: "Bereit",
    imageClass: "image-suite",
    description: "Ruhige große Wohnung mit Balkon, Familienbereich und guter Anbindung.",
  },
];

const defaultBookings = [
  {
    id: "B-1001",
    apartmentId: "wohnung-1",
    guest: "Anna Keller",
    email: "anna@example.com",
    channel: "Airbnb",
    start: "2026-07-08",
    end: "2026-07-11",
    paid: true,
    amount: 435,
    status: "Bestätigt",
  },
  {
    id: "B-1002",
    apartmentId: "wohnung-1",
    guest: "Mark Weber",
    email: "mark@example.com",
    channel: "Booking.com",
    start: "2026-07-14",
    end: "2026-07-18",
    paid: false,
    amount: 580,
    status: "Zahlung offen",
  },
  {
    id: "B-1003",
    apartmentId: "wohnung-2",
    guest: "Sofia Marino",
    email: "sofia@example.com",
    channel: "Booking.com",
    start: "2026-07-09",
    end: "2026-07-12",
    paid: true,
    amount: 570,
    status: "Bestätigt",
  },
  {
    id: "B-1004",
    apartmentId: "wohnung-2",
    guest: "Jonas Krüger",
    email: "jonas@example.com",
    channel: "Airbnb",
    start: "2026-07-12",
    end: "2026-07-15",
    paid: false,
    amount: 570,
    status: "Zahlung offen",
  },
];

const week = [
  { label: "Di 7", date: "2026-07-07" },
  { label: "Mi 8", date: "2026-07-08" },
  { label: "Do 9", date: "2026-07-09" },
  { label: "Fr 10", date: "2026-07-10" },
  { label: "Sa 11", date: "2026-07-11" },
  { label: "So 12", date: "2026-07-12" },
  { label: "Mo 13", date: "2026-07-13" },
];

const channels = [
  { name: "Airbnb", mode: "Kalender Sync", sync: "Live", status: "Aktiv" },
  { name: "Booking.com", mode: "Kalender Sync", sync: "Live", status: "Aktiv" },
  { name: "Website", mode: "Direktbestellung", sync: "Echtzeit", status: "Aktiv" },
];

function readBookings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    return [...defaultBookings];
  }
  return [...defaultBookings];
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

let bookings = readBookings();

function toDate(value) {
  return new Date(`${value}T00:00:00`);
}

function nights(start, end) {
  return Math.max(Math.round((toDate(end) - toDate(start)) / 86400000), 0);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return toDate(aStart) < toDate(bEnd) && toDate(bStart) < toDate(aEnd);
}

function findApartment(id) {
  return apartments.find((apartment) => apartment.id === id);
}

function formatDate(value) {
  return toDate(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoney(value) {
  return `€${value.toLocaleString("de-DE")}`;
}

function nextDay(value) {
  const date = toDate(value);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function statusClass(status) {
  if (status === "Bereit" || status === "Aktiv" || status === "Bestätigt") return "ok";
  if (status === "Zahlung offen" || status === "Offen") return "warn";
  return "bad";
}

function findConflicts(items = bookings) {
  const conflicts = [];
  for (let index = 0; index < items.length; index += 1) {
    for (let compare = index + 1; compare < items.length; compare += 1) {
      const first = items[index];
      const second = items[compare];
      if (first.apartmentId === second.apartmentId && overlaps(first.start, first.end, second.start, second.end)) {
        conflicts.push([first, second]);
      }
    }
  }
  return conflicts;
}

function bookingTotal(apartmentId, start, end) {
  return nights(start, end) * findApartment(apartmentId).price;
}

function createCell(text, className) {
  const element = document.createElement("div");
  element.className = `cell ${className}`.trim();
  element.textContent = text;
  return element;
}

function renderCalendar(container) {
  if (!container) return;
  container.innerHTML = "";
  container.append(createCell("", "header"));
  week.forEach((day) => container.append(createCell(day.label, "header")));

  const conflictBookings = new Set(findConflicts().flat());
  apartments.forEach((apartment) => {
    container.append(createCell(apartment.name, "apartment-name"));
    week.forEach((day) => {
      const active = bookings.find((booking) => (
        booking.apartmentId === apartment.id && overlaps(booking.start, booking.end, day.date, nextDay(day.date))
      ));
      const slot = createCell("", "");
      if (active) {
        const stay = document.createElement("div");
        stay.className = `stay ${channelClass(active.channel)}${conflictBookings.has(active) ? " conflict" : ""}`;
        stay.innerHTML = `<strong>${active.guest}</strong><span>${active.channel}</span>`;
        slot.append(stay);
      }
      container.append(slot);
    });
  });
}

function channelClass(channel) {
  if (channel === "Airbnb") return "airbnb";
  if (channel === "Booking.com") return "booking";
  return "website";
}

function initCustomerPage() {
  const apartmentSelect = document.querySelector("#customerApartment");
  const checkIn = document.querySelector("#customerCheckIn");
  const checkOut = document.querySelector("#customerCheckOut");
  const guest = document.querySelector("#customerName");
  const email = document.querySelector("#customerEmail");
  const payment = document.querySelector("#customerPayment");
  const price = document.querySelector("#customerPrice");
  const result = document.querySelector("#customerResult");
  const form = document.querySelector("#customerBookingForm");

  apartmentSelect.innerHTML = apartments.map((apartment) => `<option value="${apartment.id}">${apartment.name}</option>`).join("");
  renderPublicApartments();
  updateCustomerPrice();

  [apartmentSelect, checkIn, checkOut].forEach((control) => control.addEventListener("input", updateCustomerPrice));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const apartment = findApartment(apartmentSelect.value);
    const start = checkIn.value;
    const end = checkOut.value;
    const totalNights = nights(start, end);

    if (totalNights < 1) {
      showResult(result, "Abreise muss nach der Anreise liegen.", "bad");
      return;
    }

    if (!guest.value.trim() || !email.value.trim()) {
      showResult(result, "Bitte Name und E-Mail eintragen.", "bad");
      return;
    }

    const collision = bookings.find((booking) => (
      booking.apartmentId === apartment.id && overlaps(start, end, booking.start, booking.end)
    ));

    if (collision) {
      showResult(result, `${apartment.name} ist in diesem Zeitraum bereits belegt. Bitte wähle andere Daten.`, "bad");
      return;
    }

    const booking = {
      id: `W-${Date.now().toString().slice(-6)}`,
      apartmentId: apartment.id,
      guest: guest.value.trim(),
      email: email.value.trim(),
      channel: "Website",
      start,
      end,
      paid: payment.value === "Website Zahlung",
      amount: bookingTotal(apartment.id, start, end),
      status: payment.value === "Website Zahlung" ? "Bestätigt" : "Zahlung offen",
    };

    bookings.push(booking);
    saveBookings(bookings);
    showResult(result, `Bestellung ${booking.id} wurde angelegt. Zeitraum ist blockiert.`, "ok");
    form.reset();
    apartmentSelect.value = apartments[0].id;
    checkIn.value = "2026-07-19";
    checkOut.value = "2026-07-21";
    updateCustomerPrice();
  });

  function updateCustomerPrice() {
    price.textContent = formatMoney(bookingTotal(apartmentSelect.value || apartments[0].id, checkIn.value, checkOut.value));
  }
}

function renderPublicApartments() {
  const container = document.querySelector("#publicApartments");
  if (!container) return;
  container.innerHTML = apartments.map((apartment) => `
    <article class="apartment-card">
      <div class="apartment-photo ${apartment.imageClass}" aria-hidden="true"></div>
      <div class="apartment-content">
        <div>
          <p class="eyebrow">${apartment.rooms}</p>
          <h3>${apartment.name}</h3>
          <p>${apartment.description}</p>
        </div>
        <div class="apartment-bottom">
          <strong>${formatMoney(apartment.price)} / Nacht</strong>
          <span class="status ok">${apartment.status}</span>
        </div>
      </div>
    </article>
  `).join("");
}

function initAdminPage() {
  const search = document.querySelector("#adminSearch");
  const filterButtons = document.querySelectorAll("[data-filter]");
  let activeFilter = "all";

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeFilter = button.dataset.filter;
      renderAdmin(search.value.trim().toLowerCase(), activeFilter);
    });
  });

  search.addEventListener("input", () => renderAdmin(search.value.trim().toLowerCase(), activeFilter));
  document.querySelector("#syncNow")?.addEventListener("click", showSyncPulse);
  renderAdmin("", activeFilter);
}

function renderAdmin(filter = "", activeFilter = "all") {
  document.querySelector("#adminApartmentCount").textContent = String(apartments.length);
  document.querySelector("#adminOrderCount").textContent = String(bookings.length);
  document.querySelector("#adminOpenPayments").textContent = formatMoney(bookings.filter((booking) => !booking.paid).reduce((sum, booking) => sum + booking.amount, 0));
  document.querySelector("#adminConflictCount").textContent = String(findConflicts().length);

  renderOrders(filter, activeFilter);
  renderCalendar(document.querySelector("#adminCalendar"));
  renderAdminApartments();
  renderPayments(filter);
  renderChannels();
}

function renderOrders(filter, activeFilter) {
  const container = document.querySelector("#adminOrders");
  const filtered = bookings
    .filter((booking) => activeFilter === "all" || !booking.paid)
    .filter((booking) => {
      const apartment = findApartment(booking.apartmentId).name;
      const haystack = `${booking.guest} ${booking.email} ${booking.channel} ${apartment} ${booking.id}`.toLowerCase();
      return haystack.includes(filter);
    })
    .sort((a, b) => toDate(a.start) - toDate(b.start));

  container.innerHTML = filtered.map((booking) => {
    const apartment = findApartment(booking.apartmentId);
    return `
      <article class="order-row">
        <div>
          <strong>${booking.guest}</strong>
          <span>${booking.id} · ${apartment.name} · ${booking.channel}</span>
        </div>
        <div>
          <strong>${formatDate(booking.start)} - ${formatDate(booking.end)}</strong>
          <span>${nights(booking.start, booking.end)} Nächte · ${formatMoney(booking.amount)}</span>
        </div>
        <span class="status ${statusClass(booking.status)}">${booking.status}</span>
      </article>
    `;
  }).join("") || `<p class="empty-state">Keine Bestellungen gefunden.</p>`;
}

function renderAdminApartments() {
  const container = document.querySelector("#adminApartments");
  container.innerHTML = apartments.map((apartment) => `
    <article class="list-row">
      <div>
        <strong>${apartment.name}</strong>
        <span>${apartment.rooms} · ${formatMoney(apartment.price)}/Nacht</span>
      </div>
      <span class="status ok">${apartment.status}</span>
    </article>
  `).join("");
}

function renderPayments(filter) {
  const container = document.querySelector("#adminPayments");
  const openBookings = bookings
    .filter((booking) => !booking.paid)
    .filter((booking) => `${booking.guest} ${booking.channel} ${findApartment(booking.apartmentId).name}`.toLowerCase().includes(filter));

  container.innerHTML = openBookings.map((booking) => `
    <article class="list-row">
      <div>
        <strong>${booking.guest}</strong>
        <span>${findApartment(booking.apartmentId).name} · ${booking.channel}</span>
      </div>
      <span class="status warn">${formatMoney(booking.amount)}</span>
    </article>
  `).join("") || `<p class="empty-state">Keine offenen Zahlungen.</p>`;
}

function renderChannels() {
  const container = document.querySelector("#adminChannels");
  container.innerHTML = channels.map((channel) => `
    <article class="list-row">
      <div>
        <strong>${channel.name}</strong>
        <span>${channel.mode} · ${channel.sync}</span>
      </div>
      <span class="status ok">${channel.status}</span>
    </article>
  `).join("");
}

function showSyncPulse() {
  const airbnb = document.querySelector("#airbnbStatus");
  const booking = document.querySelector("#bookingStatus");
  airbnb.textContent = "Sync";
  booking.textContent = "Sync";
  setTimeout(() => {
    airbnb.textContent = "Live";
    booking.textContent = "Live";
  }, 700);
}

function showResult(element, message, type) {
  element.textContent = message;
  element.className = `form-result ${type}`;
}

if (document.body.dataset.page === "customer") {
  initCustomerPage();
}

if (document.body.dataset.page === "admin") {
  initAdminPage();
}
