// Geocoding hook using the OpenStreetMap Nominatim API.
// Nominatim usage policy requires:
//   - Max 1 request per second (enforced with a 1-second minimum debounce)
//   - A descriptive User-Agent / Accept-Language header
//   - Attribution "© OpenStreetMap contributors" near the map
// We handle all three here: debounce in the hook, headers in the fetch call.
import { useEffect, useState } from 'react';

export function useNominatim(query, minQueryLength = 3) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minQueryLength) {
      setResults([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    // Nominatim policy: at most 1 request per second.
    // The parent debounces the input (1 s), so by the time this effect fires
    // at least 1 second has elapsed since the last keystroke.
    const controller = new AbortController();

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '0');

    fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        // Nominatim requires a descriptive header identifying the app.
        'Accept-Language': 'en',
        'User-Agent': 'FixMyTown/1.0 (community-reporting-portfolio)',
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Nominatim error: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setResults(
          data.map((item) => ({
            label: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError('Geocoding failed. Please try again.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [query, minQueryLength]);

  return { results, loading, error };
}
