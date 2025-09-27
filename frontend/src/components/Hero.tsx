"use client";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10">
                <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-purple-500/30 via-fuchsia-400/20 to-sky-400/30 blur-3xl" />
                <div className="absolute -bottom-24 right-10 h-80 w-80 rounded-full bg-gradient-to-tr from-blue-400/30 via-emerald-400/20 to-purple-400/30 blur-3xl" />
            </div>
            <div className="container mx-auto px-4 py-24 text-center">
                <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl sm:text-6xl font-extrabold tracking-tight">
                    Private, Trustless Crypto Inheritance
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.6 }} className="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    Built on Aztec Network. Circuits in Noir. Keep beneficiaries and allocations private until it matters.
                </motion.p>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-8 flex items-center justify-center gap-3">
                    <Link href="/app"><Button>Launch App</Button></Link>
                    <a href="#how"><Button variant="secondary">How it works</Button></a>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="mt-12">
                    <GlassCard className="mx-auto max-w-3xl p-6">
                        <div className="grid sm:grid-cols-3 gap-6 text-left">
                            {[
                                { label: "Privacy", value: "ZK-SNARKs (Noir)" },
                                { label: "Layer", value: "Aztec Network" },
                                { label: "Safety", value: "Veto Multisig + Grace" },
                            ].map((s) => (
                                <div key={s.label}>
                                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</div>
                                    <div className="mt-1 font-medium">{s.value}</div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </section>
    );
}


