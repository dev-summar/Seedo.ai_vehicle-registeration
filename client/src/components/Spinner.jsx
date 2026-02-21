/**
 * Circular loading spinner. Use on dark buttons with white prop for contrast.
 */
export default function Spinner({ white = false, size = 18, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${white ? 'text-white' : 'text-slate-600'} ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-hidden="true"
    />
  );
}
