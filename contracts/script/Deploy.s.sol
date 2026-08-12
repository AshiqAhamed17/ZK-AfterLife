// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {PoseidonDeployer} from "../src/PoseidonDeployer.sol";

/// @title Deploy the ZK-AfterLife V1 stack
/// @notice Deploys HonkVerifier -> WillVerifier -> Poseidon(T3,T5) ->
///         InheritanceRegistry. Inactivity/grace/veto committee are chosen
///         per-will at register() time, not at deploy time.
/// @dev External deps are deployed separately and passed by address:
///        SELF_VERIFIER  - SelfHumanVerifier (see DeploySelfHumanVerifier.s.sol)
///        USDC_TOKEN     - the ERC20 escrowed alongside ETH
///      Run: forge script script/Deploy.s.sol --rpc-url <RPC> --broadcast
contract DeployScript is Script {
    struct Config {
        uint256 pk;
        address deployer;
        address selfVerifier;
        address usdc;
    }

    function run() external {
        Config memory c = _config();

        bytes memory t3code = vm.parseBytes(vm.readFile("poseidon/PoseidonT3.bin"));
        bytes memory t5code = vm.parseBytes(vm.readFile("poseidon/PoseidonT5.bin"));

        vm.startBroadcast(c.pk);

        WillVerifier willVerifier = new WillVerifier(address(new HonkVerifier()));
        address poseidonT3 = PoseidonDeployer.deploy(t3code);
        address poseidonT5 = PoseidonDeployer.deploy(t5code);

        InheritanceRegistry registry = new InheritanceRegistry(
            address(willVerifier),
            c.selfVerifier,
            c.usdc,
            poseidonT3,
            poseidonT5
        );

        vm.stopBroadcast();

        console.log("=== ZK-AfterLife V1 deployment ===");
        console.log("Deployer:           ", c.deployer);
        console.log("WillVerifier:       ", address(willVerifier));
        console.log("PoseidonT3:         ", poseidonT3);
        console.log("PoseidonT5:         ", poseidonT5);
        console.log("InheritanceRegistry:", address(registry));
        console.log("selfVerifier (ext): ", c.selfVerifier);
        console.log("usdc (ext):         ", c.usdc);
    }

    function _config() internal view returns (Config memory c) {
        c.pk = vm.envUint("PRIVATE_KEY");
        c.deployer = vm.addr(c.pk);
        c.selfVerifier = vm.envAddress("SELF_VERIFIER");
        c.usdc = vm.envAddress("USDC_TOKEN");
    }
}
