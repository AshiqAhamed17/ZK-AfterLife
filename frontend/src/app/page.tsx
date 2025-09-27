"use client";
import Hero from '@/components/Hero';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { Code, Globe, Lock, ShieldCheck, Wallet, Zap, ArrowRight, Star, Check } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Dynamic Background with Multiple Layers */}
      <div className="fixed inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950" />
        
        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-gradient-to-r from-violet-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPGZpbHRlciBpZD0ibm9pc2UiPiA8ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIvPiA8L2ZpbHRlcj4gPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC4wNSIvPiA8L3N2Zz4=')] repeat" />
      </div>

      <div className="relative z-10">
        <Hero />

        {/* Enhanced Features Section */}
        <section className="container mx-auto px-4 py-24" id="features">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-white/10 backdrop-blur-xl border-white/20 text-white">
              Privacy-First Infrastructure
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
              Why zk-afterlife-agent?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              The future of inheritance is here. Secure, private, and completely trustless.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              {
                Icon: Lock, 
                title: 'Confidential by Design', 
                desc: 'Beneficiaries and splits remain private with Noir zk-SNARKs on Aztec. Your inheritance plans stay completely confidential.',
                gradient: 'from-purple-500/20 to-pink-500/20'
              }, 
              {
                Icon: ShieldCheck, 
                title: 'Trustless Execution', 
                desc: 'No middlemen required. Ethereum heartbeat monitoring with multisig veto ensures maximum safety and reliability.',
                gradient: 'from-blue-500/20 to-cyan-500/20'
              }, 
              {
                Icon: Wallet, 
                title: 'Multi-Asset Support', 
                desc: 'ETH and ERC-20 tokens at launch, with NFT support coming next. Your entire digital wealth, secured.',
                gradient: 'from-violet-500/20 to-purple-500/20'
              }
            ].map(({ Icon, title, desc, gradient }, i) => (
              <motion.div 
                key={title} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                <div className={`relative p-8 rounded-2xl bg-gradient-to-br ${gradient} backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10`}>
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-blue-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <Icon className="text-white" size={24} />
                      </div>
                      <h3 className="text-xl font-semibold text-white">{title}</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Enhanced Tech Stack Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
                Built on Cutting-Edge ZK Tech
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Leveraging the most advanced zero-knowledge infrastructure for ultimate privacy and security
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, x: -30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: 0.1 }}
                className="group"
              >
                <div className="relative p-10 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-purple-500/30 transition-all duration-500 hover:scale-105">
                  {/* Animated border gradient */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-transparent to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl backdrop-blur-sm">
                        <Zap className="text-purple-400" size={32} />
                      </div>
                      <h3 className="text-2xl font-semibold text-white">Aztec Network</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed mb-6 text-lg">
                      Private UTXOs and contracts enabling confidential execution. The perfect foundation for inheritance where privacy is absolutely paramount.
                    </p>
                    <div className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
                      <a href="https://aztec.network" target="_blank" rel="noreferrer" className="font-medium">
                        Learn more about Aztec
                      </a>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: 0.2 }}
                className="group"
              >
                <div className="relative p-10 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-blue-500/30 transition-all duration-500 hover:scale-105">
                  {/* Animated border gradient */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-transparent to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl backdrop-blur-sm">
                        <Code className="text-blue-400" size={32} />
                      </div>
                      <h3 className="text-2xl font-semibold text-white">Noir Language</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed mb-6 text-lg">
                      Advanced zk-SNARK circuits that prove your will's validity without revealing its contents. Built specifically for privacy-first applications.
                    </p>
                    <div className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                      <a href="https://noir-lang.org" target="_blank" rel="noreferrer" className="font-medium">
                        Explore Noir
                      </a>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Enhanced How It Works Section */}
        <section className="py-24" id="how">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
                How it Works
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                A simple three-step process that ensures your digital legacy is protected
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  step: "01",
                  title: "Register Your Will",
                  description: "Encrypt your inheritance plan off-chain, store commitment on Aztec, and set up heartbeat monitoring with veto capabilities on Ethereum.",
                  icon: Lock,
                  delay: 0.1
                },
                {
                  step: "02", 
                  title: "Maintain Heartbeat",
                  description: "Check-in periodically to maintain your on-chain heartbeat. If missed, a grace period automatically starts with emergency veto capability.",
                  icon: Star,
                  delay: 0.2
                },
                {
                  step: "03",
                  title: "Execute Privately", 
                  description: "After the grace period, submit a zero-knowledge proof to distribute assets privately on Aztec with complete confidentiality.",
                  icon: Check,
                  delay: 0.3
                }
              ].map(({ step, title, description, icon: Icon, delay }) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay }}
                  className="group relative"
                >
                  <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10">
                    {/* Step number */}
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {step}
                    </div>
                    
                    {/* Icon */}
                    <div className="mb-6">
                      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl w-fit">
                        <Icon className="text-purple-400" size={32} />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-2xl font-semibold text-white mb-4">{title}</h3>
                    <p className="text-gray-300 leading-relaxed">{description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Enhanced Powered By Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
                Powered by Industry Leaders
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  name: "Aztec Network",
                  description: "Private UTXOs and contracts for confidential execution",
                  gradient: "from-purple-500/10 to-pink-500/10",
                  delay: 0.1
                },
                {
                  name: "Noir",
                  description: "zk-SNARK circuits to prove your will without revealing it",
                  gradient: "from-blue-500/10 to-cyan-500/10", 
                  delay: 0.2
                },
                {
                  name: "Ethereum",
                  description: "Public heartbeat monitoring, watchdog, and veto multisig",
                  gradient: "from-violet-500/10 to-purple-500/10",
                  delay: 0.3
                }
              ].map(({ name, description, gradient, delay }) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay }}
                  className="group"
                >
                  <div className={`relative p-8 rounded-2xl bg-gradient-to-br ${gradient} backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105`}>
                    <h3 className="text-xl font-semibold text-white mb-3">{name}</h3>
                    <p className="text-gray-300">{description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Enhanced CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative max-w-4xl mx-auto text-center"
            >
              {/* Background effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 rounded-3xl blur-3xl" />
              <div className="relative p-12 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/20">
                <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
                  Ready to Secure Your Digital Legacy?
                </h3>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  Join the future of inheritance planning. Private, secure, and completely trustless.
                </p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <Link href="/app">
                    <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      Launch App
                      <ArrowRight className="ml-2" size={20} />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  );
}