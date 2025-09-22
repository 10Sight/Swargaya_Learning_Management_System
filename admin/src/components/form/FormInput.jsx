import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconEye, IconEyeOff, IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export const FormInput = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  success,
  type = "text",
  className = "",
  disabled = false,
  required = false,
  helperText,
  showSuccessIndicator = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={inputType}
          disabled={disabled}
          className={cn(
            "transition-all duration-200",
            error && "border-red-500 pr-10 focus-visible:ring-red-500",
            success && showSuccessIndicator && "border-green-500 pr-10 focus-visible:ring-green-500",
            isPassword && "pr-10",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          {...props}
        />
        
        {/* Success indicator */}
        {success && showSuccessIndicator && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            <IconCheck className="h-4 w-4" />
          </div>
        )}
        
        {/* Error indicator */}
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <IconAlertCircle className="h-4 w-4" />
          </div>
        )}
        
        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <IconEyeOff className="h-4 w-4" />
            ) : (
              <IconEye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      
      {/* Helper text and error message */}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <IconAlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      
      {success && !error && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <IconCheck className="h-4 w-4 flex-shrink-0" />
          <span>{success}</span>
        </p>
      )}
    </div>
  );
};