export default function Badge({
    children,
    className = ""
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium bg-white/60 dark:bg-black/30 backdrop-blur ${className}`}>
            {children}
        </span>
    );
}


