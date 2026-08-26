const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`card p-6 ${hover ? 'hover:shadow-cardHover transition-shadow duration-200' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const StatCard = ({ label, value, icon: Icon, accent = 'green', suffix = '' }) => {
  const accentStyles = {
    green: 'bg-sti-blue-50 text-sti-blue',
    yellow: 'bg-yellow-50 text-sti-yellow-dark',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-500',
  };

  return (
    <Card hover className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accentStyles[accent]}`}>
        {Icon && <Icon className="w-6 h-6" strokeWidth={2} />}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-sti-gray-dark dark:text-white leading-tight">
          {value}{suffix}
        </p>
        <p className="text-sm text-sti-gray truncate">{label}</p>
      </div>
    </Card>
  );
};

export default Card;
