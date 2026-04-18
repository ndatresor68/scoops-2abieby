import React from 'react';

export default function Card({ 
  children, 
  title, 
  subtitle, 
  actions, 
  padding, 
  style = {}, 
  className = "", 
  onMouseEnter, 
  onMouseLeave,
  variant = "default"
}) {
  const variants = {
    default: "bg-white border border-slate-200/80 shadow-soft",
    glass: "bg-white/80 backdrop-blur-md border border-white/20 shadow-premium",
    outline: "bg-transparent border-2 border-slate-100",
    primary: "bg-primary-50 border border-primary-100",
  };

  const paddingClass = padding ? "" : "p-5 sm:p-6";

  return (
    <section
      className={`rounded-3xl overflow-hidden transition-all duration-300 ${variants[variant] || variants.default} ${paddingClass} ${className}`}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {(title || subtitle || actions) && (
        <div className="flex justify-between items-start gap-4 mb-4 pb-3.5 border-b border-slate-100">
          <div className="min-w-0">
            {title && (
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      
      <div className="relative">
        {children}
      </div>
    </section>
  );
}
