import * as React from "react"

export type SwitchSize = "default" | "sm"

/**
 * Toggle switch for enabling/disabling a setting. Use instead of Checkbox
 * when the change takes effect immediately without a form submit.
 */
export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: SwitchSize
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      size = "default",
      className = "",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [checked, setChecked] = React.useState(defaultChecked)
    const isChecked = controlledChecked !== undefined ? controlledChecked : checked

    const toggle = () => {
      if (disabled) return
      const next = !isChecked
      setChecked(next)
      onCheckedChange?.(next)
    }

    return (
      <button
        ref={ref}
        role="switch"
        id={id}
        aria-checked={isChecked}
        data-slot="switch"
        data-size={size}
        data-checked={String(isChecked)}
        disabled={disabled}
        className={className}
        onClick={toggle}
        type="button"
        {...props}
      >
        <span data-slot="switch-thumb" />
      </button>
    )
  }
)
Switch.displayName = "Switch"
