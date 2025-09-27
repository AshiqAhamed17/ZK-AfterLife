export default function GlassCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={
                "rounded-2xl border border-white/15 dark:border-white/10 bg-white/50 " +
                "dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] " +
                className
            }
        >
            {children}
        </div>
    );
}


