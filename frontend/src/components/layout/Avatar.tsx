import * as React from "react"

export type AvatarSize = "default" | "sm" | "lg"

/**
 * User or entity avatar with image + text fallback.
 * Compose: Avatar > AvatarImage + AvatarFallback. Group with AvatarGroup.
 */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: AvatarSize
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ size = "default", className = "", children, ...props }, ref) => {
    return (
      <span ref={ref} data-slot="avatar" data-size={size} className={className} {...props}>
        {children}
      </span>
    )
  }
)
Avatar.displayName = "Avatar"

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export function AvatarImage({ src, alt = "", className = "", ...props }: AvatarImageProps) {
  const [error, setError] = React.useState(false)
  if (error || !src) return null
  return (
    <img
      data-slot="avatar-image"
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  )
}

export const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className = "", children, ...props }, ref) => (
    <span ref={ref} data-slot="avatar-fallback" className={className} {...props}>
      {children}
    </span>
  )
)
AvatarFallback.displayName = "AvatarFallback"

export const AvatarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, style, ...props }, ref) => (
    <div ref={ref} data-slot="avatar-group" className={className} style={{ display: "flex", gap: "-0.5rem", ...style }} {...props}>
      {children}
    </div>
  )
)
AvatarGroup.displayName = "AvatarGroup"
