// Map view: reports as colored CircleMarkers with two-way highlight sync.
// Props:
//   reports         — array of report objects (may include distance_km)
//   loading/error   — standard async states
//   center          — [lat, lng] to fly to (from geocoder or geolocation)
//   zoom            — zoom level to use when flying to `center`
//   activeId        — id of the report highlighted from the list
//   onMarkerClick   — called with report when a marker is clicked
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import '../utils/leafletIcons.js';
import StatusBadge from './StatusBadge.jsx';
import { CategoryIcon } from '../utils/categoryIcons.jsx';
import { ThumbsUp } from 'lucide-react';

// Status colors — must match --status-* design tokens in styles.css.
const STATUS_COLORS = {
  reported:    '#d97706',
  in_progress: '#2563eb',
  resolved:    '#16a34a',
};
const ACTIVE_SCALE = 1.6; // size multiplier for the highlighted marker

function FitBounds({ reports, center, zoom }) {
  const map = useMap();

  // Fly to explicit center (geocoder / geolocation) first.
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, zoom ?? Math.max(map.getZoom(), 13), { duration: 1 });
  }, [center, zoom, map]);

  // Auto-fit to all markers only when no explicit center is set.
  useEffect(() => {
    if (center) return;
    if (!reports.length) return;
    if (reports.length === 1) {
      map.setView([reports[0].latitude, reports[0].longitude], 15);
    } else {
      const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [reports, center, map]);

  return null;
}

// Pans the map to a specific report when it becomes "active" (selected from list).
function PanToActive({ reports, activeId }) {
  const map = useMap();
  useEffect(() => {
    if (!activeId) return;
    const r = reports.find((r) => r.id === activeId);
    if (r) map.panTo([r.latitude, r.longitude], { animate: true });
  }, [activeId, reports, map]);
  return null;
}

export default function ReportMap({
  reports,
  loading,
  error,
  center,
  zoom,
  activeId,
  onMarkerClick,
}) {
  if (loading) return <div className="loading">Loading map…</div>;
  if (error)   return <div className="alert alert--error">{error}</div>;

  return (
    <MapContainer center={center ?? [0, 0]} zoom={center ? (zoom ?? 13) : 2} scrollWheelZoom className="civic-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds reports={reports} center={center} zoom={zoom} />
      <PanToActive reports={reports} activeId={activeId} />

      {reports.map((r) => {
        const isActive = r.id === activeId;
        const fillColor = STATUS_COLORS[r.status] || '#64748b';
        return (
          <CircleMarker
            key={r.id}
            center={[r.latitude, r.longitude]}
            radius={isActive ? 11 : 8}
            pathOptions={{
              color: isActive ? '#0f172a' : '#ffffff',
              weight: isActive ? 3 : 2,
              fillColor,
              fillOpacity: isActive ? 1 : 0.85,
            }}
            eventHandlers={{ click: () => onMarkerClick?.(r) }}
          >
            <Popup>
              <div className="map-popup">
                <StatusBadge status={r.status} />
                <div className="map-popup__title">{r.title}</div>
                <div className="map-popup__meta">
                  <CategoryIcon category={r.category} size={12} />
                  {r.category}
                  &nbsp;·&nbsp;
                  <ThumbsUp size={11} aria-hidden="true" />
                  {r.upvote_count}
                  {r.distance_km != null && (
                    <>&nbsp;· {parseFloat(r.distance_km).toFixed(1)} km</>
                  )}
                </div>
                <Link to={`/reports/${r.id}`} className="btn btn--ghost btn--block btn--sm">
                  View report
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {reports.length === 0 && (
        <div className="map-empty">No reports in this area.</div>
      )}
    </MapContainer>
  );
}
