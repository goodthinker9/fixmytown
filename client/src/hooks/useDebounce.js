// Returns a debounced copy of `value`: it only updates `delay` ms after the
// last change. Used so the search box doesn't fire an API request on every
// keystroke.
import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
