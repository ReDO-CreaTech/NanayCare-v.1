let map;
let userLocation;
let markers = [];

async function initMap() {
  navigator.geolocation.getCurrentPosition(async pos => {
    userLocation = [pos.coords.latitude, pos.coords.longitude];

    map = L.map('map').setView(userLocation, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    L.marker(userLocation).addTo(map).bindPopup("You are here");

    const res = await fetch("hospitals.json");
    const data = await res.json();

    renderPlaces(data);
    setupSearch(data);
  });
}

function renderPlaces(data) {
  const list = document.getElementById("list");
  list.innerHTML = "";
  markers = [];

  data.forEach(place => {
    const distance = getDistance(userLocation, [place.lat, place.lng]);

    if (distance <= 10) {
      const marker = L.marker([place.lat, place.lng])
        .addTo(map)
        .bindPopup(`
          <b>${place.name}</b><br>
          ${distance.toFixed(2)} km<br>
          ${place.contact}
        `);

      markers.push({ marker, place });

      // 🧾 Sidebar item
      const div = document.createElement("div");
      div.className = "place";
      div.innerHTML = `
        <b>${place.name}</b><br>
        ${distance.toFixed(2)} km<br>
        <small>${place.type}</small>
      `;

      div.onclick = () => {
        map.setView([place.lat, place.lng], 16);
        marker.openPopup();
      };

      list.appendChild(div);
    }
  });
}

function setupSearch(data) {
  document.getElementById("search").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();

    const filtered = data.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    );

    renderPlaces(filtered);
  });
}

function getDistance(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;

  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;

  const x =
    Math.sin(dLat/2)**2 +
    Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

initMap();