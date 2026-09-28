const variantMap = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  danger: 'btn-danger',
};

const Button = ({ variant = 'primary', children, className = '', icon: Icon, loading = false, disabled = false, ...props }) => {
  return (
    <button
      // { ...props } is spread last, so `disabled` has to be pulled out as its own
      // prop and re-applied afterwards. Previously it was set before the spread,
      // which meant an explicit disabled={false} from a caller overwrote the
      // loading state and left a "submitting" button clickable (double submits).
      className={`${variantMap[variant]} inline-flex items-center justify-center gap-2 ${className}`}
      {...props}
      disabled={loading || disabled}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon className="w-4 h-4" />
      )}
      {children}
    </button>
  );
};

export default Button;
