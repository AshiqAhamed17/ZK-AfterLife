// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {PoseidonDeployer} from "../src/PoseidonDeployer.sol";

/// @title Deploy the ZK-AfterLife V1 stack
/// @notice Deploys HonkVerifier -> WillVerifier -> Poseidon(T3,T5) ->
///         InheritanceRegistry. Timing defaults to demo values; override via env
///         for production (e.g. 365d inactivity / 30d grace).
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
        uint256 inactivity;
        uint256 grace;
        uint256 vetoThreshold;
        address veto2;
    }

    function run() external {
        Config memory c = _config();
        address[] memory vetoMembers = _vetoMembers(c);

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
        c.inactivity = vm.envOr("INACTIVITY_PERIOD", uint256(30));
        c.grace = vm.envOr("GRACE_PERIOD", uint256(15));
        c.vetoThreshold = vm.envOr("VETO_THRESHOLD", uint256(1));
        c.veto2 = vm.envOr("VETO_MEMBER_2", address(0));
    }

    function _vetoMembers(Config memory c) internal pure returns (address[] memory members) {
        if (c.veto2 != address(0)) {
            members = new address[](2);
            members[0] = c.deployer;
            members[1] = c.veto2;
        } else {
            members = new address[](1);
            members[0] = c.deployer;
        }
    }
}
