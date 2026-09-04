import * as React from "react"

export type SeparatorOrientation = "horizontal" | "vertical"

/**
 * Thin divider line between sections or list items.
 * Horizontal by default; set orientation="vertical" for inline separators.
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: SeparatorOrientation
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = "horizontal", className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="separator"
        data-orientation={orientation}
        role="separator"
        aria-orientation={orientation}
        className={className}
        {...props}
      />
    )
  }
)
Separator.displayName = "Separator"
