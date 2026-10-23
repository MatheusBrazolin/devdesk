import * as Menu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuRadioGroup = Menu.RadioGroup

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-52 rounded-lg border border-border bg-surface p-1 shadow-pop animate-pop-in',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  )
}

const itemClass =
  'relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-fg-muted outline-none select-none data-[highlighted]:bg-elevated data-[highlighted]:text-fg [&_svg]:size-4'

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={cn(itemClass, className)} {...props} />
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(itemClass, 'pr-8', className)} {...props}>
      {children}
      <Menu.ItemIndicator className="absolute right-2.5">
        <Check />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return (
    <Menu.Label
      className={cn('px-2.5 pt-2 pb-1 text-[11px] font-medium text-fg-subtle', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <Menu.Separator className={cn('my-1 h-px bg-border', className)} />
}
