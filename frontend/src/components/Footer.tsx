import { Github, Mail, Twitter } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="relative mt-16">
            <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.25),transparent_60%)]" />
            <div className="border-t">
                <div className="container mx-auto px-4 py-8">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="font-semibold mb-3">zk-afterlife-agent</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                Private inheritance executor built on Aztec Network with Noir circuits.
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Powered by</span>
                                <a href="https://aztec.network" target="_blank" rel="noreferrer" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                                    Aztec Network
                                </a>
                                <a href="https://noir-lang.org" target="_blank" rel="noreferrer" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                                    Noir
                                </a>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-3">Built by</h3>
                            <div className="flex items-center gap-2 mb-4">
                                <span>InfiniteAudits</span>
                                <a href="https://infiniteaudits.xyz" target="_blank" rel="noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">
                                    infiniteaudits.xyz
                                </a>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Web3 security experts building the future of ZK applications.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-3">Connect</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <a href="https://github.com/InfiniteAudits" target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md">
                                    <Github size={20} />
                                </a>
                                <a href="https://twitter.com/InfiniteAudits" target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md">
                                    <Twitter size={20} />
                                </a>
                                <a href="mailto:hello@infiniteaudits.xyz" className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md">
                                    <Mail size={20} />
                                </a>
                            </div>
                            <div className="flex flex-col gap-2 text-sm">
                                <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                                <Link href="/terms" className="hover:underline">Terms of Service</Link>
                            </div>
                        </div>
                    </div>
                    <div className="border-t mt-8 pt-6 text-center text-sm text-gray-600 dark:text-gray-300">
                        <p>© 2024 InfiniteAudits. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}


