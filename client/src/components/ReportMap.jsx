/**
 * ReportMap — UI-E4
 *
 * Changes:
 *  - Loading state now shows Skeleton map mode instead of bare "Loading map…" text.
 *  - Empty state is a proper styled overlay inside the MapContainer so the map
 *    tiles still render (users can see the basemap even with 0 results).
 *  - FitBounds now only auto-fits when reports change and there is no explicit center;
 *    it no longer re-fits when activeId changes (that caused jarring map jumps).
 *  - Marker focus: the popup opens on click but the CircleMarker itself is not
 *    focusable by keyboard (SVG canvas limitation). We document this known issue.
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import '../utils/leafletIcons.js';
import StatusBadge from './StatusBadge.jsx';
import { CategoryIcon } from '../utils/categoryIcons.jsx';
import { ThumbsUp } from 'lucide-react';
import Skeleton from './Skeleton.jsx';

const STATUS_COLORS = {
  reported:    '#d97706',
  in_progress: '#2563eb',
  resolved:    '#16a34a',
};

function FitBounds({ reports, center, zoom }) {
  const map      = useMap();
  const prevCenterRef = useRef(null);

  useEffect(() => {
    if (!center) return;
    // Only fly when the center actually changes — prevents spurious re-renders
    // from causing the map to snap back while the user is panning.
    const key = `${center[0]},${center[1]}`;
    if (prevCenterRef.current === key) return;
    prevCenterRef.current = key;
    map.flyTo(center, zoom ?? Math.max(map.getZoom(), 13), { duration: 0.9 });
  }, [center, zoom, map]);

  useEffect(() => {
    if (center) return;
    if (!reports.length) return;
    if (reports.length === 1) {
      map.setView([reports[0].latitude, reports[0].longitude], 15);
    } else {
      const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports.length, center, map]);

  return null;
}

function PanToActive({ reports, activeId }) {
  const map = useMap();
  useEffect(() => {
    if (!activeId) return;
    const r = reports.find((r) => r.id === activeId);
    if (r) map.panTo([r.latitude, r.longitude], { animate: true, duration: 0.4 });
  }, [activeId, reports, map]);
  return null;
}

export default function ReportMap({ reports, loading, error, center, zoom, activeId, onMarkerClick }) {
  if (loading) return <Skeleton map />;
  if (error)   return <div className="alert alert--error" role="alert">{error}</div>;

  return (
    <MapContainer
      center={center ?? [0, 0]}
      zoom={center ? (zoom ?? 13) : 2}
      scrollWheelZoom
      className="civic-map"
      // Accessible name for the map canvas
      aria-label="Map showing community reports"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds reports={reports} center={center} zoom={zoom} />
      <PanToActive reports={reports} activeId={activeId} />

      {reports.map((r) => {
        const isActive  = r.id === activeId;
        const fillColor = STATUS_COLORS[r.status] || '#64748b';
        return (
          <CircleMarker
            key={r.id}
            center={[r.latitude, r.longitude]}
            radius={isActive ? 12 : 8}
            pathOptions={{
              color:       isActive ? '#0f172a' : '#ffffff',
              weight:      isActive ? 3 : 2,
              fillColor,
              fillOpacity: isActive ? 1 : 0.88,
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
    </MapContainer>
  );
}
