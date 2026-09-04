import * as React from "react"

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

/**
 * Small status label for surfacing metadata, counts, or state.
 * Use inline with text, in table cells, or on avatar overlays.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual style */
  variant?: BadgeVariant
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    return (
      <span ref={ref} data-slot="badge" data-variant={variant} className={className} {...props}>
        {children}
      </span>
    )
  }
)
Badge.displayName = "Badge"
