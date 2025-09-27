'use client';

import { useWallet } from '@/lib/WalletContext';
import Link from 'next/link';
import MobileMenu from './MobileMenu';
import ThemeToggle from './ThemeToggle';
import Button from './ui/Button';

export default function Header() {
    const { isConnected, account, balance, connectWallet, disconnectWallet, isLoading } = useWallet();

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <header className="border-b bg-white/70 dark:bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                <Link href="/" className="font-semibold tracking-tight">
                    zk-afterlife-agent
                </Link>
                <nav className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <Link href="/app" className="hover:text-foreground transition-colors">App</Link>
                    <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
                    <Link href="/checkin" className="hover:text-foreground transition-colors">Check-in</Link>
                    <Link href="/execute" className="hover:text-foreground transition-colors">Execute</Link>
                    <Link href="/claims" className="hover:text-foreground transition-colors">Claims</Link>
                    <Link href="/withdraw" className="hover:text-foreground transition-colors">Withdraw</Link>
                    <Link href="/veto" className="hover:text-foreground transition-colors">Veto</Link>

                    {/* Wallet Connection */}
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <div className="flex items-center gap-2">
                                <div className="text-xs text-gray-500">
                                    {parseFloat(balance).toFixed(4)} ETH
                                </div>
                                <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs">
                                    {formatAddress(account!)}
                                </div>
                                <Button
                                    onClick={disconnectWallet}
                                    variant="outline"
                                    className="text-xs px-3 py-1"
                                >
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={connectWallet}
                                disabled={isLoading}
                                className="text-xs px-3 py-1"
                            >
                                {isLoading ? 'Connecting...' : 'Connect Wallet'}
                            </Button>
                        )}
                    </div>

                    <ThemeToggle />
                </nav>
                <MobileMenu />
            </div>
        </header>
    );
}


