/**
 * LazyLocationMap — React.lazy wrapper around LocationMap (the click-to-pin
 * picker used in the NewReport wizard step 1).
 *
 * Same motivation as LazyReportMap: keeps Leaflet out of the main bundle.
 */
import { lazy, Suspense } from 'react';
import Skeleton from './Skeleton.jsx';

const LocationMap = lazy(() => import('./LocationMap.jsx'));

export default function LazyLocationMap(props) {
  return (
    <Suspense fallback={<Skeleton map />}>
      <LocationMap {...props} />
    </Suspense>
  );
}
