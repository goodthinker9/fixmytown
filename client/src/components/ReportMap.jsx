// Map view: reports as colored CircleMarkers. Colors come from CSS token
// values so they stay in sync with the design system.
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import '../utils/leafletIcons.js';
import StatusBadge from './StatusBadge.jsx';
import { CategoryIcon } from '../utils/categoryIcons.jsx';
import { ThumbsUp } from 'lucide-react';

// Status colors pulled from CSS design token values (must match --status-* vars).
const STATUS_COLORS = {
  reported:    '#d97706', // --status-reported-fg
  in_progress: '#2563eb', // --status-in-progress-fg
  resolved:    '#16a34a', // --status-resolved-fg
};

function FitBounds({ reports }) {
  const map = useMap();
  useEffect(() => {
    if (!reports.length) return;
    if (reports.length === 1) {
      map.setView([reports[0].latitude, reports[0].longitude], 15);
    } else {
      const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [reports, map]);
  return null;
}

export default function ReportMap({ reports, loading, error }) {
  if (loading) return <div className="loading">Loading map…</div>;
  if (error) return <div className="alert alert--error">{error}</div>;
  if (!reports.length) return <div className="empty-state">No reports match your filters.</div>;

  return (
    <MapContainer center={[0, 0]} zoom={2} scrollWheelZoom className="report-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds reports={reports} />
      {reports.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.latitude, r.longitude]}
          radius={9}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: STATUS_COLORS[r.status] || '#64748b',
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <div className="map-popup">
              <StatusBadge status={r.status} />
              <div className="map-popup__title">{r.title}</div>
              <div className="map-popup__meta">
                <CategoryIcon category={r.category} size={13} />
                {r.category}
                &nbsp;·&nbsp;
                <ThumbsUp size={12} aria-hidden="true" />
                {r.upvote_count}
              </div>
              <Link to={`/reports/${r.id}`} className="btn btn--ghost btn--block btn--sm">
                View report
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
