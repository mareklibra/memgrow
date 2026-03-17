import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/ui/styles';

export const buttonVariants = cva(
  'flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-400',
        danger: 'bg-red-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export function Button({ variant, children, className, ...rest }: ButtonProps) {
  const { disabled } = rest;
  return (
    <button
      {...rest}
      className={cn(buttonVariants({ variant }), disabled && 'bg-gray-500', className)}
    >
      {children}
    </button>
  );
}
