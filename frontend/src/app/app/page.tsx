"use client";

import Badge from '@/components/ui/Badge';
import GlassCard from '@/components/ui/GlassCard';
import { useWallet } from '@/lib/WalletContext';
import { motion, useAnimation } from 'framer-motion';
import {
    AlertTriangle,
    ArrowRight,
    Ban,
    CheckCircle,
    Clock,
    FileText,
    Globe,
    Heart,
    Info,
    Key,
    Lock,
    Shield,
    Sparkles,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

// Techno-ZK themed UI revamp. Logic untouched — only presentation, layout and motion.

function TiltCard({ children, className = "", hoverStrength = 12 }) {
    const ref = useRef(null);
    const controls = useAnimation();

    function handleMove(e) {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = (x / rect.width) * 2 - 1; // -1 .. 1
        const py = (y / rect.height) * 2 - 1;
        const rotateX = (-py * hoverStrength).toFixed(2);
        const rotateY = (px * hoverStrength).toFixed(2);
        const translateZ = Math.max(6, hoverStrength / 2);
        controls.start({ rotateX, rotateY, translateZ, transition: { type: 'spring', stiffness: 200, damping: 20 } });
    }

    function handleLeave() {
        controls.start({ rotateX: 0, rotateY: 0, translateZ: 0, transition: { duration: 0.6, ease: 'easeOut' } });
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            animate={controls}
            style={{ transformStyle: 'preserve-3d' }}
            className={"relative perspective-1000 " + className}
        >
            {children}
        </motion.div>
    );
}

export default function AppHome() {
    const { isConnected, account, balance } = useWallet();


    const features = [
        {
            icon: <Lock className="w-6 h-6" />,
            title: "Privacy-First",
            description: "Zero-knowledge proofs ensure your will details remain confidential",
            color: "from-purple-500/10 to-blue-500/10"
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Trustless Execution",
            description: "Automated execution without relying on third parties",
            color: "from-green-500/10 to-emerald-500/10"
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: "Beneficiary Protection",
            description: "Secure asset distribution with cryptographic guarantees",
            color: "from-orange-500/10 to-red-500/10"
        }
    ];


    const quickActions = [
        {
            href: "/register",
            icon: <FileText className="w-8 h-8" />,
            title: "Register Will",
            description: "Create and encrypt your digital will with ZK proofs",
            gradient: "from-purple-600 to-blue-600",
            hoverGradient: "from-purple-700 to-blue-700",
            features: ["Multi-beneficiary support", "Asset allocation", "ZK commitment"]
        },
        {
            href: "/checkin",
            icon: <Heart className="w-8 h-8" />,
            title: "Heartbeat Check-in",
            description: "Keep your will active with regular heartbeat transactions",
            gradient: "from-green-600 to-emerald-600",
            hoverGradient: "from-green-700 to-emerald-700",
            features: ["Activity monitoring", "Grace period management", "Real-time status"]
        },
        {
            href: "/execute",
            icon: <Zap className="w-8 h-8" />,
            title: "Execute Will",
            description: "Execute wills using verified ZK proofs on Aztec L2",
            gradient: "from-orange-600 to-red-600",
            hoverGradient: "from-orange-700 to-red-700",
            features: ["Proof verification", "Asset distribution", "L2 execution"]
        },
        {
            href: "/veto",
            icon: <Ban className="w-8 h-8" />,
            title: "Emergency Veto",
            description: "Emergency veto system for trusted parties",
            gradient: "from-red-600 to-pink-600",
            hoverGradient: "from-red-700 to-pink-700",
            features: ["Multi-signature veto", "Grace period extension", "Emergency control"]
        }
    ];


    const stats = [
        {
            label: "Total Wills",
            value: "0",
            icon: <FileText className="w-5 h-5" />,
            color: "text-purple-400"
        },
        {
            label: "Active Check-ins",
            value: "0",
            icon: <Heart className="w-5 h-5" />,
            color: "text-green-400"
        },
        {
            label: "Executed Wills",
            value: "0",
            icon: <Zap className="w-5 h-5" />,
            color: "text-orange-400"
        },
        {
            label: "Veto Count",
            value: "0",
            icon: <Ban className="w-5 h-5" />,
            color: "text-red-400"
        }
    ];


    return (
        <div className="min-h-screen bg-gradient-to-br from-[#040214] via-[#07021a] to-[#03010a] text-white antialiased font-sans">
            {/* Subtle animated starfield */}
            <motion.div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2 }}
            >
                <div className="absolute -top-20 left-1/4 w-[600px] h-[600px] blur-3xl opacity-20 bg-gradient-to-br from-[#3b82f6] to-[#7c3aed] rounded-full mix-blend-screen animate-blob"></div>
                <div className="absolute top-10 right-1/4 w-[400px] h-[400px] blur-2xl opacity-10 bg-gradient-to-br from-[#06b6d4] to-[#8b5cf6] rounded-full mix-blend-screen animate-blob animation-delay-2000"></div>
            </motion.div>

            <div className="relative z-10 container mx-auto px-6 py-16">
                {/* Centered Hero */}
                <div className="max-w-5xl mx-auto text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-5xl md:text-6xl font-extralight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#a78bfa] to-[#60a5fa]"
                        style={{ WebkitTextStroke: '0.2px rgba(255,255,255,0.02)' }}
                    >
                        Digital Inheritance — Private. Trustless. Future-ready.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
                    >
                        Manage your privacy-preserving digital will with zero-knowledge proofs. Built on Aztec Network with Noir circuits and Pyth integrations for verifiable oracles.
                    </motion.p>

                    {/* Wallet Pill */}
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <TiltCard className="w-fit">
                            <motion.div
                                className="px-6 py-3 rounded-full bg-black/40 border border-white/5 backdrop-blur-md shadow-lg flex items-center gap-4"
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            >
                                <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.12)]" />
                                <div>
                                    <div className="text-sm text-gray-200">{isConnected ? 'Wallet Connected' : 'Connect Wallet'}</div>
                                    {isConnected && <div className="text-xs font-mono text-green-300">{account?.slice(0, 6)}...{account?.slice(-4)} • {balance} ETH</div>}
                                </div>
                            </motion.div>
                        </TiltCard>
                    </div>
                </div>

                {/* Slight restructure: Stats then Quick Actions split */}
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Stats Column */}
                    <div className="lg:col-span-1">
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mb-4"
                            >
                                <h3 className="text-lg font-semibold text-gray-200">Overview</h3>
                                <p className="text-sm text-gray-400">Snapshot of your registry and activity.</p>
                            </motion.div>

                            <div className="grid grid-cols-2 gap-3">
                                {stats.map((stat, i) => (
                                    <TiltCard key={i} className="">
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.12 + i * 0.06 }}
                                            className="p-4 rounded-xl border border-white/6 backdrop-blur-md bg-black/30 hover:bg-black/25"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-11 h-11 rounded-lg bg-gradient-to-br from-white/3 to-white/2 flex items-center justify-center shadow-inner`}>
                                                        {stat.icon}
                                                    </div>
                                                    <div>
                                                        <div className="text-xl font-medium">{stat.value}</div>
                                                        <div className="text-xs text-gray-400">{stat.label}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-400">{/* small spark or trend */}<TrendingUp className="w-4 h-4 text-gray-400" /></div>
                                            </div>
                                        </motion.div>
                                    </TiltCard>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions + Features Column */}
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {quickActions.map((action, idx) => (
                                <TiltCard key={idx} className="">
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 + idx * 0.06 }}
                                        className={`p-6 rounded-2xl border border-white/6 backdrop-blur-lg bg-gradient-to-br from-black/40 to-black/30 hover:shadow-[0_8px_40px_rgba(50,50,80,0.45)]`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${action.gradient} text-black/10 shadow-md`}>
                                                {action.icon}
                                            </div>
                                            <ArrowRight className="w-6 h-6 text-gray-400" />
                                        </div>

                                        <h3 className="mt-4 text-2xl font-semibold text-white">{action.title}</h3>
                                        <p className="text-sm text-gray-300 mt-2">{action.description}</p>

                                        <div className="mt-4 grid grid-cols-1 gap-2">
                                            {action.features.map((f, fi) => (
                                                <motion.div key={fi} whileHover={{ x: 6 }} className="flex items-center gap-3 text-sm text-gray-300">
                                                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] shadow-[0_4px_20px_rgba(124,58,237,0.12)]" />
                                                    <span>{f}</span>
                                                </motion.div>
                                            ))}
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-white/4 flex items-center justify-between">
                                            <div className="text-sm text-purple-300 font-medium flex items-center gap-2">Get Started <ArrowRight className="w-4 h-4" /></div>
                                            <Link href={action.href}>
                                                <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-white/6 to-white/4 border border-white/5 text-sm text-white backdrop-blur-sm hover:scale-105 transition-transform">Open</button>
                                            </Link>
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>

                        {/* Features larger section */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {features.map((f, i) => (
                                <TiltCard key={i} className="">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + i * 0.08 }}
                                        className="p-6 rounded-2xl border border-white/6 backdrop-blur-lg bg-black/30"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/4 to-white/5 flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)]">
                                                {f.icon}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold">{f.title}</h4>
                                                <p className="text-sm text-gray-300 mt-1">{f.description}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Technology Stack */}
                <div className="mt-12">
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center mb-6">
                        <h3 className="text-2xl font-semibold">Powered By</h3>
                        <p className="text-sm text-gray-400">Cutting-edge blockchain and cryptography technologies</p>
                    </motion.div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { name: "Aztec Network", icon: <Globe className="w-8 h-8" /> },
                            { name: "Noir Circuits", icon: <Key className="w-8 h-8" /> },
                            { name: "Ethereum L1", icon: <Shield className="w-8 h-8" /> },
                            { name: "ZK-SNARKs", icon: <Lock className="w-8 h-8" /> }
                        ].map((tech, i) => (
                            <TiltCard key={i} className="">
                                <motion.div whileHover={{ scale: 1.03, y: -6 }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + i * 0.06 }} className="p-6 rounded-xl border border-white/6 backdrop-blur-md bg-black/25 flex flex-col items-center gap-3">
                                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-visible">
                                        <div className="absolute -inset-2 rounded-2xl blur-xl opacity-30 bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] transform-gpu animate-pulse-slow" />
                                        <div className="relative z-10 w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center">
                                            {tech.icon}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium">{tech.name}</div>
                                </motion.div>
                            </TiltCard>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-12">
                    <TiltCard className="">
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="p-10 rounded-3xl border border-white/5 backdrop-blur-lg bg-black/30 relative overflow-hidden">
                            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0f172a]/20 to-[#0b1220]/10" />
                            <div className="max-w-4xl mx-auto text-center">
                                <h3 className="text-3xl font-semibold">Ready to Secure Your Digital Legacy?</h3>
                                <p className="mt-3 text-gray-300">Join the future of privacy-preserving digital inheritance. Your assets, your privacy, your control.</p>

                                <div className="mt-6 flex items-center justify-center gap-4">
                                    <Link href="/register">
                                        <motion.button whileHover={{ scale: 1.03, boxShadow: '0 12px 40px rgba(96,165,250,0.12)' }} className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-black font-semibold">Get Started Now</motion.button>
                                    </Link>
                                    <Link href="/">
                                        <motion.button whileHover={{ scale: 1.02 }} className="px-8 py-4 rounded-xl border border-white/6 text-sm text-white">Learn More</motion.button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </TiltCard>
                </div>
            </div>

            {/* Small utilities: smooth animation helpers */}
            <style jsx>{`
                .perspective-1000 { perspective: 1200px; }
                .animate-blob { animation: blob 8s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                @keyframes blob {
                    0% { transform: translateY(0px) scale(1); }
                    33% { transform: translateY(-12px) scale(1.05); }
                    66% { transform: translateY(8px) scale(0.98); }
                    100% { transform: translateY(0px) scale(1); }
                }
                .animate-pulse-slow { animation: pulse 3.5s infinite; }
                @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.95; } 100% { opacity: 0.6; } }
            `}</style>
        </div>
    );
}
