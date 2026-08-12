// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {PoseidonDeployer} from "../src/PoseidonDeployer.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {MockSelfVerifier} from "../test/mocks/MockSelfVerifier.sol";

/// @title Deploy the full V1 stack to a local Anvil devnet for the in-browser
///        E2E harness (register -> prove -> verify -> claim).
/// @dev Test-only: stands in MockUSDC + MockSelfVerifier for the real ERC20 /
///      Self Protocol hub, which cannot be exercised on a local chain. Every
///      other contract (HonkVerifier, WillVerifier, Poseidon, InheritanceRegistry)
///      is the genuine production contract. Timers default short so the E2E
///      run finishes in real wall-clock time.
///      Run: forge script script/DeployLocalE2E.s.sol --rpc-url http://localhost:8545 --broadcast --private-key <pk>
contract DeployLocalE2EScript is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address owner = vm.envOr("E2E_OWNER", deployer);

        uint256 inactivity = vm.envOr("INACTIVITY_PERIOD", uint256(20));
        uint256 grace = vm.envOr("GRACE_PERIOD", uint256(15));

        bytes memory t3code = vm.parseBytes(vm.readFile("poseidon/PoseidonT3.bin"));
        bytes memory t5code = vm.parseBytes(vm.readFile("poseidon/PoseidonT5.bin"));

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC();
        MockSelfVerifier self = new MockSelfVerifier();
        WillVerifier willVerifier = new WillVerifier(address(new HonkVerifier()));
        address poseidonT3 = PoseidonDeployer.deploy(t3code);
        address poseidonT5 = PoseidonDeployer.deploy(t5code);

        InheritanceRegistry registry = new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            poseidonT3,
            poseidonT5
        );

        self.setVerified(owner, true);
        usdc.mint(owner, 1_000_000e6);

        vm.stopBroadcast();

        console.log("=== ZK-AfterLife local E2E deployment ===");
        console.log("REGISTRY_ADDR=%s", address(registry));
        console.log("USDC_ADDR=%s", address(usdc));
        console.log("SELF_VERIFIER_ADDR=%s", address(self));
        console.log("WILL_VERIFIER_ADDR=%s", address(willVerifier));
        console.log("POSEIDON_T3_ADDR=%s", poseidonT3);
        console.log("POSEIDON_T5_ADDR=%s", poseidonT5);
        console.log("INACTIVITY=%s", inactivity);
        console.log("GRACE=%s", grace);
    }
}
