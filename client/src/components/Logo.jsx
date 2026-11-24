// Logo component: logo-mark SVG + "FixMyTown" wordmark (with "Town" in the
// primary blue). Used in the Navbar, Login, and Register pages.
// The wordmark is text, not an image, so it scales freely and is indexable.
export default function Logo({ size = 28, className = '' }) {
  return (
    <span className={`logo ${className}`} aria-label="FixMyTown">
      <img
        src="/logo-mark.svg"
        alt=""
        width={size}
        height={size}
        className="logo__mark"
        aria-hidden="true"
      />
      <span className="logo__word">
        Fix<span className="logo__word--accent">My</span>Town
      </span>
    </span>
  );
}
