// Centralizes Leaflet setup so every map component gets it by importing this:
//  - the Leaflet stylesheet (tiles + popups + marker layout)
//  - a fix for the default marker icon, whose image paths break under bundlers
//    like Vite. Pointing Leaflet at the bundled asset URLs fixes it.
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
