import React from 'react';

export default function Input({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder = "", 
  disabled = false, 
  required = false, 
  error = "", 
  icon, 
  style = {}, 
  inputStyle = {}, 
  className = "",
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`} style={style}>
      {label && (
        <label className="text-xs sm:text-sm font-bold text-slate-700 ml-1 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative group">
        {icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10 flex items-center ${error ? 'text-red-500' : 'text-slate-400 group-focus-within:text-primary-600'}`}>
            {icon}
          </div>
        )}
        
        <input
          type={type}
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full bg-white border rounded-2xl px-4 py-3.5 sm:py-3
            focus:ring-4 outline-none transition-all duration-200 placeholder:text-slate-400
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
            text-base sm:text-sm min-h-[48px] font-medium
            ${icon ? 'pl-11' : ''}
            ${error 
              ? 'border-red-500/50 focus:ring-red-500/10 focus:border-red-500 shadow-[0_0_0_4px_rgba(220,38,38,0.08)]' 
              : 'border-slate-200/90 focus:ring-primary-600/10 focus:border-primary-600 shadow-sm'
            }
          `}
          style={inputStyle}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-xs font-semibold text-red-500 ml-1 mt-0.5 animate-fadeIn">
          {error}
        </p>
      )}
    </div>
  );
}
