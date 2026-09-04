import * as React from "react"

export type ButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link"

export type ButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg"

/**
 * Versatile action button with multiple visual variants and sizes.
 * Use for any user-initiated action: submitting forms, navigation, confirmations.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style */
  variant?: ButtonVariant
  /** Size preset */
  size?: ButtonSize
  /** Render as a child element (e.g. anchor) */
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  // `asChild` is part of the API surface (kept for parity with the reference
  // implementation and other shadcn-style consumers) but the reference Button
  // always renders a native <button>; it does not currently merge props onto
  // a child element the way DialogTrigger/DialogClose do.
  ({ variant = "default", size = "default", className = "", asChild: _asChild = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={className}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
