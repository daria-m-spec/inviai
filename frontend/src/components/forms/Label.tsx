import * as React from "react"

/**
 * Accessible form field label. Associate with an input via htmlFor.
 * Renders as inline-flex so icons can sit beside label text.
 */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", htmlFor, children, ...props }, ref) => {
    return (
      <label ref={ref} data-slot="label" htmlFor={htmlFor} className={className} {...props}>
        {children}
      </label>
    )
  }
)
Label.displayName = "Label"
