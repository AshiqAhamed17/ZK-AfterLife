/**
 * @file DynamicAssetValuation.tsx
 * @description Component for displaying dynamic asset valuation using Pyth price feeds
 * @notice This component implements the PRIZE-WINNING dynamic asset valuation feature
 * 
 * 🏆 PRIZE-WINNING FEATURE: Dynamic Asset Valuation
 * - Real-time price display from Pyth Network
 * - Fair USD-based distribution regardless of crypto price changes
 * - Interactive distribution calculator
 * - Visual representation of asset allocation
 */

import React, { useEffect, useState } from 'react';
import { BeneficiaryDistribution, DynamicDistribution, PythAssetInfo, pythService } from '../services/PythService';

interface DynamicAssetValuationProps {
    assets: string[];
    amounts: string[];
    beneficiaries: string[];
    percentages: number[];
    onDistributionCalculated?: (distribution: DynamicDistribution) => void;
}

interface PriceDisplayProps {
    assets: string[];
    amounts: string[];
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ assets, amounts }) => {
    const [assetPrices, setAssetPrices] = useState<PythAssetInfo[]>([]);
    const [totalValue, setTotalValue] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                setLoading(true);
                setError(null);

                const prices = await pythService.getAssetPrices(assets);
                setAssetPrices(prices);

                const total = await pythService.calculateTotalValue(assets, amounts);
                setTotalValue(total);

                console.log('✅ Asset prices loaded:', prices);
                console.log('💰 Total portfolio value:', pythService.formatUSDValue(total));
            } catch (err) {
                console.error('❌ Failed to fetch asset prices:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch prices');
            } finally {
                setLoading(false);
            }
        };

        if (assets.length > 0) {
            fetchPrices();
        }
    }, [assets, amounts]);

    if (loading) {
        return (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-lg p-6 border border-white/15">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Loading prices from Pyth Network...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <div className="flex items-center">
                    <div className="text-red-600 dark:text-red-400">⚠️</div>
                    <span className="ml-3 text-red-800 dark:text-red-200">{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-lg p-6 border border-white/15">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">🏆</span>
                Dynamic Asset Valuation (Pyth Network)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-4">
                    <div className="text-sm opacity-90">Total Portfolio Value</div>
                    <div className="text-2xl font-bold">{pythService.formatUSDValue(totalValue)}</div>
                </div>

                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg p-4">
                    <div className="text-sm opacity-90">Assets Tracked</div>
                    <div className="text-2xl font-bold">{assets.length}</div>
                </div>
            </div>

            <div className="space-y-3">
                {assetPrices.map((asset, index) => (
                    <div key={asset.symbol} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {asset.symbol.charAt(0)}
                            </div>
                            <div className="ml-3">
                                <div className="font-medium text-gray-900 dark:text-white">{asset.symbol}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {pythService.formatAssetAmount(amounts[index], asset.symbol)}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                                {pythService.formatUSDValue(asset.usdPrice * 1e18)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                per {asset.symbol}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                💡 Powered by Pyth Network - Real-time price feeds for fair inheritance distribution
            </div>
        </div>
    );
};

const DistributionCalculator: React.FC<DynamicAssetValuationProps> = ({
    assets,
    amounts,
    beneficiaries,
    percentages,
    onDistributionCalculated
}) => {
    const [distribution, setDistribution] = useState<DynamicDistribution | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculateDistribution = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🏆 Calculating dynamic distribution...');

            const result = await pythService.calculateDynamicDistribution(
                assets,
                amounts,
                beneficiaries,
                percentages
            );

            setDistribution(result);
            onDistributionCalculated?.(result);

            console.log('✅ Dynamic distribution calculated:', result);
        } catch (err) {
            console.error('❌ Failed to calculate distribution:', err);
            setError(err instanceof Error ? err.message : 'Failed to calculate distribution');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-lg p-6 border border-white/15">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">⚖️</span>
                Dynamic Distribution Calculator
            </h3>

            <div className="mb-6">
                <button
                    onClick={calculateDistribution}
                    disabled={loading || assets.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Calculating Fair Distribution...
                        </div>
                    ) : (
                        'Calculate Fair Distribution'
                    )}
                </button>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="text-red-600 dark:text-red-400">⚠️</div>
                        <span className="ml-3 text-red-800 dark:text-red-200">{error}</span>
                    </div>
                </div>
            )}

            {distribution && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-4">
                        <div className="text-sm opacity-90">Total Inheritance Value</div>
                        <div className="text-2xl font-bold">
                            {pythService.formatUSDValue(distribution.totalValueUSD)}
                        </div>
                        <div className="text-sm opacity-90 mt-1">
                            Calculated at {new Date(distribution.calculationTime).toLocaleString()}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {distribution.distributions.map((dist, index) => (
                            <BeneficiaryDistributionCard key={index} distribution={dist} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const BeneficiaryDistributionCard: React.FC<{ distribution: BeneficiaryDistribution }> = ({ distribution }) => {
    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                        {distribution.beneficiary.slice(0, 6)}...{distribution.beneficiary.slice(-4)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {distribution.percentage.toFixed(1)}% allocation
                    </div>
                </div>

                <div className="text-right">
                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                        {pythService.formatUSDValue(distribution.usdValue)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">USD Value</div>
                </div>
            </div>

            <div className="space-y-2">
                {distribution.assets.map((asset, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-2"></div>
                            <span className="text-gray-600 dark:text-gray-300">
                                {pythService.formatAssetAmount(asset.amount, asset.asset, 2)}
                            </span>
                        </div>
                        <span className="text-gray-900 dark:text-white font-medium">
                            {pythService.formatUSDValue(asset.usdValue)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DynamicAssetValuation: React.FC<DynamicAssetValuationProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'prices' | 'distribution'>('prices');

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                    onClick={() => setActiveTab('prices')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'prices'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    📊 Real-time Prices
                </button>
                <button
                    onClick={() => setActiveTab('distribution')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'distribution'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    ⚖️ Fair Distribution
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'prices' && <PriceDisplay assets={props.assets} amounts={props.amounts} />}
            {activeTab === 'distribution' && <DistributionCalculator {...props} />}

            {/* Prize Information */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-6">
                <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">🏆</span>
                    <h3 className="text-xl font-bold">Pyth Network Prize Feature</h3>
                </div>
                <div className="text-sm opacity-90">
                    This dynamic asset valuation feature uses Pyth Network's real-time price feeds to ensure
                    fair inheritance distribution regardless of crypto price volatility. Eligible for the
                    $5,000 "Most Innovative use of Pyth pull oracle" prize!
                </div>
            </div>
        </div>
    );
};

export default DynamicAssetValuation;
