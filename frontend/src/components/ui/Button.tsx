export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "outline";
};

export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
        primary: "bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 px-5 py-2.5",
        secondary: "border hover:bg-gray-50 dark:hover:bg-neutral-900 px-5 py-2.5",
        ghost: "hover:bg-gray-50 dark:hover:bg-neutral-900 px-3 py-2",
        outline: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-5 py-2.5",
    };
    return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}


