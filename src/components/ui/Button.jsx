import React from 'react';

export default function Button({ 
  children, 
  onClick, 
  type = "button", 
  variant = "primary", 
  size = "md", 
  disabled = false, 
  className = "",
  icon: Icon,
  loading = false,
  fullWidth = false,
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 whitespace-nowrap";
  
  const variants = {
    primary: "bg-primary-600 text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 hover:shadow-primary-600/30 border border-primary-700/10",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    outline: "bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 hover:shadow-red-600/30 border border-red-700/10",
    success: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-600/30 border border-emerald-700/10",
  };

  const sizes = {
    sm: "px-3.5 py-2 text-xs rounded-xl gap-1.5 min-h-[38px]",
    md: "px-5 py-2.5 text-sm rounded-2xl gap-2 min-h-[44px]",
    lg: "px-7 py-3.5 text-base rounded-2xl gap-3 min-h-[52px]",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${widthStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          {Icon && <span className="flex items-center">{Icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
