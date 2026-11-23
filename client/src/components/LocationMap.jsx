// Leaflet map that lets the user drop a pin by clicking, plus an imperative
// fly-to used by the "Use my current location" button.
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import '../utils/leafletIcons.js';

// Captures map clicks and forwards the clicked lat/lng up. Returns nothing to
// render — it just hooks into the map's event system.
function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Imperatively pans/zooms the map to a new center. Used after geolocation
// (MapContainer's `center` prop only applies on first render, so to move the
// map later we must call a map method via useMap()).
function FlyController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 15));
  }, [center, map]);
  return null;
}

export default function LocationMap({ position, onPositionChange, flyTo }) {
  // Initial view: if we already have a pin use it, otherwise show the world.
  const center = position || [0, 0];
  const zoom = position ? 15 : 2;

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="location-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onPositionChange} />
      <FlyController center={flyTo} />
      {position && <Marker position={position} />}
    </MapContainer>
  );
}
