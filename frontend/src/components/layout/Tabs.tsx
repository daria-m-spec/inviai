import * as React from "react"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue>({ value: "", onValueChange: () => {} })

/**
 * Tabbed content switcher. Compose: Tabs > TabsList (TabsTrigger+) + TabsContent+.
 */
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: "horizontal" | "vertical"
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  orientation = "horizontal",
  className = "",
  children,
  ...props
}: TabsProps) {
  const [value, setValue] = React.useState(defaultValue)
  const current = controlledValue !== undefined ? controlledValue : value

  const handleChange = (v: string) => {
    setValue(v)
    onValueChange?.(v)
  }

  return (
    <TabsContext.Provider value={{ value: current, onValueChange: handleChange }}>
      <div data-slot="tabs" data-orientation={orientation} className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "line"
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    return (
      <div ref={ref} data-slot="tabs-list" data-variant={variant} role="tablist" className={className} {...props}>
        {children}
      </div>
    )
  }
)
TabsList.displayName = "TabsList"

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className = "", children, disabled, ...props }, ref) => {
    const { value: current, onValueChange } = React.useContext(TabsContext)
    const selected = current === value
    return (
      <button
        ref={ref}
        data-slot="tabs-trigger"
        role="tab"
        aria-selected={selected}
        data-active={String(selected)}
        disabled={disabled}
        className={className}
        onClick={() => !disabled && onValueChange(value)}
        type="button"
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className = "", children, ...props }, ref) => {
    const { value: current } = React.useContext(TabsContext)
    if (current !== value) return null
    return (
      <div ref={ref} data-slot="tabs-content" role="tabpanel" className={className} {...props}>
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"
