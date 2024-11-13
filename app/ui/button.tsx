import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ children, className, ...rest }: ButtonProps) {
  const { disabled } = rest;
  return (
    <button
      {...rest}
      className={clsx(
        // hover:bg-blue-400
        "flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        {
          "bg-blue-500": !disabled,
          "bg-gray-500": disabled,
        },
        className
      )}
    >
      {children}
    </button>
  );
}
