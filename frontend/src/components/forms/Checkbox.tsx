import * as React from "react"

/**
 * Binary toggle for boolean form values. Supports controlled and uncontrolled usage.
 * Pair with Label for accessible labelling.
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  /** Controlled checked state */
  checked?: boolean
  /** Callback receiving the new boolean value */
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", checked, defaultChecked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
    }
    return (
      <input
        ref={ref}
        data-slot="checkbox"
        type="checkbox"
        className={className}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"
