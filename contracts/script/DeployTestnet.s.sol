// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {PoseidonDeployer} from "../src/PoseidonDeployer.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {MockSelfVerifier} from "../test/mocks/MockSelfVerifier.sol";

/// @title Deploy the V1 stack to a public EVM testnet (Sepolia, Base Sepolia,
///        zkSync Era Sepolia, ...).
/// @dev MockUSDC + MockSelfVerifier stand in for the real ERC20 / Self Protocol
///      hub: Self's real IdentityVerificationHub only exists on Celo/Celo
///      Sepolia, and InheritanceRegistry.register() calls selfVerifier as a
///      same-chain call, so real Self-gating can't work on these chains
///      without cross-chain messaging (out of scope here). MockSelfVerifier's
///      setVerified is intentionally permissionless — the frontend exposes a
///      "Skip verification (testnet mock)" button so any real visitor can
///      still complete a real will end to end. Every other contract
///      (HonkVerifier, WillVerifier, Poseidon, InheritanceRegistry, the will
///      circuit) is the genuine production system. Inactivity/grace/veto
///      committee are chosen per-will at register() time, not deploy time.
///      Run: forge script script/DeployTestnet.s.sol --rpc-url <RPC> --broadcast --private-key <pk> [--verify --etherscan-api-key <KEY>]
contract DeployTestnetScript is Script {
    struct Config {
        uint256 pk;
        address deployer;
    }

    struct Deployed {
        address registry;
        address usdc;
        address self;
        address willVerifier;
        address poseidonT3;
        address poseidonT5;
    }

    function run() external {
        Config memory c = _config();
        Deployed memory d = _deploy(c);
        _logResult(c, d);
    }

    function _deploy(Config memory c) internal returns (Deployed memory d) {
        bytes memory t3code = vm.parseBytes(vm.readFile("poseidon/PoseidonT3.bin"));
        bytes memory t5code = vm.parseBytes(vm.readFile("poseidon/PoseidonT5.bin"));

        vm.startBroadcast(c.pk);

        d.usdc = address(new MockUSDC());
        d.self = address(new MockSelfVerifier());
        d.willVerifier = address(new WillVerifier(address(new HonkVerifier())));
        d.poseidonT3 = PoseidonDeployer.deploy(t3code);
        d.poseidonT5 = PoseidonDeployer.deploy(t5code);

        d.registry = address(
            new InheritanceRegistry(d.willVerifier, d.self, d.usdc, d.poseidonT3, d.poseidonT5)
        );

        vm.stopBroadcast();
    }

    function _logResult(Config memory c, Deployed memory d) internal view {
        console.log("=== ZK-AfterLife testnet deployment ===");
        console.log("Deployer:           ", c.deployer);
        console.log("WillVerifier:       ", d.willVerifier);
        console.log("PoseidonT3:         ", d.poseidonT3);
        console.log("PoseidonT5:         ", d.poseidonT5);
        console.log("REGISTRY_ADDR=%s", d.registry);
        console.log("USDC_ADDR=%s", d.usdc);
        console.log("SELF_VERIFIER_ADDR=%s", d.self);
        console.log("DEPLOY_BLOCK=%s", block.number);
    }

    function _config() internal view returns (Config memory c) {
        c.pk = vm.envUint("PRIVATE_KEY");
        c.deployer = vm.addr(c.pk);
    }
}
