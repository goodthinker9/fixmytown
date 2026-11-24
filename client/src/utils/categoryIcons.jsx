// Single source of truth for category → Lucide icon.
// Import this map anywhere you need a category icon (chips, filters, map popups,
// report form). Using one file means adding a new category only requires a
// change here.
import {
  Droplets,
  Zap,
  Construction,
  Trash2,
  ShieldAlert,
  CircleHelp,
} from 'lucide-react';

export const CATEGORY_ICONS = {
  water:       Droplets,
  electricity: Zap,
  roads:       Construction,
  garbage:     Trash2,
  safety:      ShieldAlert,
  other:       CircleHelp,
};

// Convenience wrapper: renders the icon for a given category with consistent
// sizing. `size` matches Lucide's default (24) if not specified.
export function CategoryIcon({ category, size = 15, className = '', 'aria-hidden': ariaHidden = true }) {
  const Icon = CATEGORY_ICONS[category] || CircleHelp;
  return <Icon size={size} className={className} aria-hidden={ariaHidden} />;
}
