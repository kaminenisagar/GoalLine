export default function StarRating({ value = 0, onChange, size = 'md' }) {
  const sizes = { sm: '1.25rem', md: '1.75rem', lg: '2.25rem' };
  const fontSize = sizes[size] || sizes.md;

  return (
    <div className="gl-star-rating" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`gl-star ${n <= value ? 'gl-star--on' : ''}`}
          style={{ fontSize }}
          onClick={() => onChange?.(n)}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
