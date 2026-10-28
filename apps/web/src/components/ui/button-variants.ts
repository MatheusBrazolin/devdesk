import { cva } from 'class-variance-authority'

/** Botões em pílula. Primário em lavanda com texto em roxo bem escuro. */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-colors duration-[140ms] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary font-semibold text-primary-fg hover:bg-primary/88',
        outline: 'border border-border-strong bg-transparent text-fg hover:bg-elevated',
        ghost: 'text-fg-muted hover:bg-elevated hover:text-fg',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-4 text-[14px]',
        lg: 'h-10 px-5 text-[15px]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
