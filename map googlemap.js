let map;
let userLocation;

async function initMap() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get("lat")) || 14.5995;
  const lng = parseFloat(params.get("lng")) || 120.9842;

  userLocation = { lat, lng };

  map = new google.maps.Map(document.getElementById("map"), {
    center: userLocation,
    zoom: 14
  });

  new google.maps.Marker({
    position: userLocation,
    map,
    label: "You"
  });

  const res = await fetch("hospitals.json");
  const data = await res.json();

  showNearest(data);
  setupSearch(data);
}

// 📍 FILTER NEAREST (GEOFENCING)
function showNearest(data) {
  data.forEach(place => {
    const distance = getDistance(userLocation, place);

    // show only within 5km
    if (distance <= 5) {
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: place.name
      });

      const info = new google.maps.InfoWindow({
        content: `
          <strong>${place.name}</strong><br>
          Type: ${place.type}<br>
          Distance: ${distance.toFixed(2)} km<br>
          Contact: ${place.contact}<br>
          Services: ${place.services.join(", ")}
        `
      });

      marker.addListener("click", () => info.open(map, marker));
    }
  });
}

// 🔍 SEARCH FUNCTION
function setupSearch(data) {
  document.getElementById("search").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();

    map.setZoom(13);

    data
      .filter(p => p.name.toLowerCase().includes(q) || p.type.includes(q))
      .forEach(p => {
        new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          title: p.name
        });
      });
  });
}

// 📏 DISTANCE (HAVERSINE)
function getDistance(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;

  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x =
    Math.sin(dLat/2) ** 2 +
    Math.sin(dLng/2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}