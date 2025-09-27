"use client";

import Badge from '@/components/ui/Badge';
import GlassCard from '@/components/ui/GlassCard';
import { useWallet } from '@/lib/WalletContext';
import { motion } from 'framer-motion';
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

export default function AppHome() {
    const { isConnected, account, balance } = useWallet();

    const features = [
        {
            icon: <Lock className="w-6 h-6" />,
            title: "Privacy-First",
            description: "Zero-knowledge proofs ensure your will details remain confidential",
            color: "from-purple-500/20 to-blue-500/20"
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Trustless Execution",
            description: "Automated execution without relying on third parties",
            color: "from-green-500/20 to-emerald-500/20"
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: "Beneficiary Protection",
            description: "Secure asset distribution with cryptographic guarantees",
            color: "from-orange-500/20 to-red-500/20"
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

                <div className="container mx-auto px-4 py-16 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-6">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-purple-300">zk-afterlife-agent Dashboard</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent mb-6">
                            Digital Inheritance
                        </h1>

                        <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                            Manage your privacy-preserving digital will with zero-knowledge proofs.
                            Built on Aztec Network with Noir circuits for ultimate security and privacy.
                        </p>

                        {/* Wallet Status */}
                        {isConnected && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-8 inline-flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-full px-6 py-3"
                            >
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span className="text-green-300 font-medium">Wallet Connected</span>
                                <span className="text-green-400 font-mono text-sm">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
                                <span className="text-green-300">{balance} ETH</span>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="container mx-auto px-4 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {stats.map((stat, index) => (
                        <GlassCard key={index} className="p-6 text-center">
                            <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center ${stat.color}`}>
                                {stat.icon}
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-400">{stat.label}</div>
                        </GlassCard>
                    ))}
                </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="container mx-auto px-4 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl font-bold text-white mb-4">Quick Actions</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Access all the core functionality of your zk-afterlife-agent dashboard
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickActions.map((action, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                        >
                            <Link href={action.href}>
                                <GlassCard className="p-8 h-full group hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white group-hover:bg-gradient-to-br ${action.hoverGradient} transition-all duration-300`}>
                                            {action.icon}
                                        </div>
                                        <ArrowRight className="w-6 h-6 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                                    </div>

                                    <h3 className="text-2xl font-bold text-white mb-3">{action.title}</h3>
                                    <p className="text-gray-400 mb-6 leading-relaxed">{action.description}</p>

                                    <div className="space-y-2">
                                        {action.features.map((feature, featureIndex) => (
                                            <div key={featureIndex} className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                                <span className="text-sm text-gray-300">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-700">
                                        <div className="flex items-center gap-2 text-purple-400 font-medium">
                                            <span>Get Started</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                        </div>
                                    </div>
                                </GlassCard>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Features Section */}
            <div className="container mx-auto px-4 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl font-bold text-white mb-4">Why Choose zk-afterlife-agent?</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Built with cutting-edge technology for the most secure and private digital inheritance solution
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                        >
                            <GlassCard className={`p-8 h-full bg-gradient-to-br ${feature.color} border-0`}>
                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-200 leading-relaxed">{feature.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Technology Stack */}
            <div className="container mx-auto px-4 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl font-bold text-white mb-4">Powered By</h2>
                    <p className="text-gray-400">Cutting-edge blockchain and cryptography technologies</p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { name: "Aztec Network", icon: <Globe className="w-8 h-8" />, color: "from-blue-500 to-cyan-500" },
                        { name: "Noir Circuits", icon: <Key className="w-8 h-8" />, color: "from-purple-500 to-pink-500" },
                        { name: "Ethereum L1", icon: <Shield className="w-8 h-8" />, color: "from-green-500 to-emerald-500" },
                        { name: "ZK-SNARKs", icon: <Lock className="w-8 h-8" />, color: "from-orange-500 to-red-500" }
                    ].map((tech, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.9 + index * 0.1 }}
                        >
                            <GlassCard className="p-6 text-center group hover:scale-105 transition-all duration-300">
                                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${tech.color} flex items-center justify-center text-white`}>
                                    {tech.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-white">{tech.name}</h3>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Call to Action */}
            <div className="container mx-auto px-4 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    className="text-center"
                >
                    <GlassCard className="p-12 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold text-white mb-4">
                                Ready to Secure Your Digital Legacy?
                            </h2>
                            <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                                Join the future of privacy-preserving digital inheritance.
                                Your assets, your privacy, your control.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/register">
                                    <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105">
                                        Get Started Now
                                    </button>
                                </Link>
                                <Link href="/">
                                    <button className="px-8 py-4 border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 font-semibold rounded-xl transition-all duration-300">
                                        Learn More
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
}


