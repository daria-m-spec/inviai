import * as React from "react"

export type SelectSize = "default" | "sm"

interface SelectContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  value: string
  setValue: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue>({
  open: false,
  setOpen: () => {},
  value: "",
  setValue: () => {},
})

/**
 * Dropdown selector for choosing from a list of options.
 * Compose: Select > SelectTrigger (SelectValue) + SelectContent (SelectItem+).
 *
 * Note: SelectContent renders inline (absolutely positioned within the
 * relatively-positioned Select wrapper) — there is no portal, so a Select
 * placed inside an overflow:hidden/auto container may have its dropdown
 * clipped.
 */
export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
}

export function Select({ value: controlledValue, defaultValue = "", onValueChange, children, ...props }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)
  const current = controlledValue !== undefined ? controlledValue : value

  const handleSetValue = (v: string) => {
    setValue(v)
    onValueChange?.(v)
  }

  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-slot="select"]')) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  return (
    <SelectContext.Provider value={{ open, setOpen, value: current, setValue: handleSetValue }}>
      <div data-slot="select" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: SelectSize
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className = "", size = "default", children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext)
    return (
      <button
        ref={ref}
        data-slot="select-trigger"
        data-size={size}
        data-open={String(open)}
        className={className}
        onClick={() => setOpen(!open)}
        type="button"
        {...props}
      >
        {children}
        <svg
          data-slot="select-trigger-icon"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "1rem", height: "1rem", flexShrink: 0, opacity: 0.5 }}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

export interface SelectValueProps {
  placeholder?: string
  className?: string
}

export function SelectValue({ placeholder = "Select an option...", className = "" }: SelectValueProps) {
  const { value } = React.useContext(SelectContext)
  return (
    <span data-slot="select-value" className={className} style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis" }}>
      {value || <span style={{ color: "var(--muted-foreground)" }}>{placeholder}</span>}
    </span>
  )
}

export const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    const { open } = React.useContext(SelectContext)
    if (!open) return null
    return (
      <div ref={ref} data-slot="select-content" className={className} {...props}>
        {children}
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

export const SelectGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="select-group" className={className} {...props}>
      {children}
    </div>
  )
)
SelectGroup.displayName = "SelectGroup"

export const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} data-slot="select-label" className={className} {...props}>
      {children}
    </div>
  )
)
SelectLabel.displayName = "SelectLabel"

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, className = "", children, disabled, ...props }, ref) => {
    const { setValue, setOpen, value: current } = React.useContext(SelectContext)
    const selected = current === value
    return (
      <div
        ref={ref}
        data-slot="select-item"
        data-selected={String(selected)}
        className={className}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setValue(value)
            setOpen(false)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (!disabled) {
              setValue(value)
              setOpen(false)
            }
          }
        }}
        {...props}
      >
        <span data-slot="select-item-text">{children}</span>
        {selected && <span data-slot="select-item-indicator">✓</span>}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => <div ref={ref} data-slot="select-separator" className={className} {...props} />
)
SelectSeparator.displayName = "SelectSeparator"
