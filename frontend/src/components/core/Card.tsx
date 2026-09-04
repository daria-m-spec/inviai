import * as React from "react"

export type CardSize = "default" | "sm"

/**
 * Surface container for grouped content: stats, settings panels, login forms, etc.
 * Compose with CardHeader, CardContent, CardFooter sub-components.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: CardSize
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", size = "default", children, ...props }, ref) => {
    return (
      <div ref={ref} data-slot="card" data-size={size} className={className} {...props}>
        {children}
      </div>
    )
  }
)
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="card-header" className={className} {...props}>
      {children}
    </div>
  )
)
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="card-title" className={className} {...props}>
      {children}
    </div>
  )
)
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="card-description" className={className} {...props}>
      {children}
    </div>
  )
)
CardDescription.displayName = "CardDescription"

export const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="card-action" className={className} {...props}>
      {children}
    </div>
  )
)
CardAction.displayName = "CardAction"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="card-content" className={className} {...props}>
      {children}
    </div>
  )
)
CardContent.displayName = "CardContent"

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="card-footer" className={className} {...props}>
      {children}
    </div>
  )
)
CardFooter.displayName = "CardFooter"
