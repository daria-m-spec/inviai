import * as React from "react"

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue>({ open: false, setOpen: () => {} })

/**
 * Modal dialog for confirmations, forms, or focused detail views.
 * Compose: Dialog > DialogTrigger + DialogContent (DialogHeader, DialogFooter, etc.).
 *
 * Note: DialogContent renders in-place in the React tree (fixed-position via
 * CSS) rather than through a portal — there is no createPortal call. This
 * matches the reference implementation; keep that in mind for z-index/stacking
 * contexts elsewhere in the app.
 */
export interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function Dialog({ open: controlledOpen, onOpenChange, defaultOpen = false, children }: DialogProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const isOpen = controlledOpen !== undefined ? controlledOpen : open

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    onOpenChange?.(v)
  }

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function DialogTrigger({ asChild, children, ...props }: DialogTriggerProps) {
  const { setOpen } = React.useContext(DialogContext)
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        setOpen(true)
      },
    })
  }
  return (
    <button data-slot="dialog-trigger" onClick={() => setOpen(true)} type="button" {...props}>
      {children}
    </button>
  )
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean
}

export function DialogContent({ className = "", children, showCloseButton = true, ...props }: DialogContentProps) {
  const { open, setOpen } = React.useContext(DialogContext)
  if (!open) return null

  return (
    <>
      <div data-slot="dialog-overlay" onClick={() => setOpen(false)} />
      <div data-slot="dialog-content" className={className} {...props}>
        {showCloseButton && (
          <button data-slot="dialog-close-btn" onClick={() => setOpen(false)} type="button" aria-label="Close">
            ✕
          </button>
        )}
        {children}
      </div>
    </>
  )
}

export const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="dialog-header" className={className} {...props}>
      {children}
    </div>
  )
)
DialogHeader.displayName = "DialogHeader"

export const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="dialog-footer" className={className} {...props}>
      {children}
    </div>
  )
)
DialogFooter.displayName = "DialogFooter"

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", children, ...props }, ref) => (
    <h2 ref={ref} data-slot="dialog-title" className={className} {...props}>
      {children}
    </h2>
  )
)
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", children, ...props }, ref) => (
    <p ref={ref} data-slot="dialog-description" className={className} {...props}>
      {children}
    </p>
  )
)
DialogDescription.displayName = "DialogDescription"

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function DialogClose({ asChild, children, ...props }: DialogCloseProps) {
  const { setOpen } = React.useContext(DialogContext)
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>
    return React.cloneElement(child, { onClick: () => setOpen(false) })
  }
  return (
    <button data-slot="dialog-close" onClick={() => setOpen(false)} type="button" {...props}>
      {children}
    </button>
  )
}
