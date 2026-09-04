import * as React from "react"

/**
 * Single-line text input. Use for any free-text or typed data entry.
 * Supports all native input types: text, email, password, number, search, file.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", ...props }, ref) => {
    return <input ref={ref} data-slot="input" type={type} className={className} {...props} />
  }
)
Input.displayName = "Input"
