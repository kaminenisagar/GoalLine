export function FormSection({ title, children }) {
  return (
    <div className="im-section">
      {title && <h4 className="im-section-title">{title}</h4>}
      <div className="im-section-grid">{children}</div>
    </div>
  );
}

export function FormField({ label, required, fullWidth, children }) {
  return (
    <label className={`im-field ${fullWidth ? 'im-field--full' : ''}`}>
      {label && (
        <span className="im-label">
          {label}
          {required && <span className="im-required"> *</span>}
        </span>
      )}
      {children}
    </label>
  );
}

export default function InteractiveModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  footer,
  children,
}) {
  if (!open) return null;

  return (
    <div className="im-overlay" onClick={onClose} role="presentation">
      <div
        className={`im-modal im-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="im-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {icon && <div className="im-icon">{icon}</div>}
        <h2 className="im-title">{title}</h2>
        {subtitle && <p className="im-subtitle">{subtitle}</p>}
        <div className="im-body">{children}</div>
        {footer && <div className="im-footer">{footer}</div>}
      </div>
    </div>
  );
}
