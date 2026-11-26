/**
 * LazyReportMap — React.lazy wrapper around ReportMap.
 *
 * Leaflet (and react-leaflet) are large (~150 KB gzipped) and only needed
 * when a map is actually rendered. By importing ReportMap through this lazy
 * wrapper, Vite emits Leaflet into its own chunk that only downloads when the
 * map first renders — keeping it out of the initial main bundle.
 *
 * Usage: drop-in replacement for <ReportMap> inside a <Suspense> boundary.
 * The parent (Home, etc.) should already have a <Skeleton map /> fallback.
 */
import { lazy, Suspense } from 'react';
import Skeleton from './Skeleton.jsx';

const ReportMap = lazy(() => import('./ReportMap.jsx'));

export default function LazyReportMap(props) {
  return (
    <Suspense fallback={<Skeleton map />}>
      <ReportMap {...props} />
    </Suspense>
  );
}
