// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/SelfHumanVerifier.sol";

/// @title SetupVerificationConfig
/// @notice Script to set up the verification configuration for SelfHumanVerifier
contract SetupVerificationConfig is Script {
    // The deployed contract address (update this with your deployed address)
    address constant SELF_HUMAN_VERIFIER_ADDRESS =
        0xAf61DbD79eAEaa2455065619063Fa5eb13fB0A4B;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Setting up Verification Configuration ===");
        console.log("Deployer:", deployer);
        console.log("Contract Address:", SELF_HUMAN_VERIFIER_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        // Get the deployed contract
        SelfHumanVerifier verifier = SelfHumanVerifier(
            SELF_HUMAN_VERIFIER_ADDRESS
        );

        // Set up the verification configuration
        console.log("\nSetting up verification configuration...");
        verifier.setupVerificationConfig();

        vm.stopBroadcast();

        // Verify the configuration
        bytes32 configId = verifier.verificationConfigId();
        uint256 minAge = verifier.MINIMUM_AGE();

        console.log("\n=== CONFIGURATION SETUP SUCCESSFUL ===");
        console.log("Verification Config ID:", vm.toString(configId));
        console.log("Minimum Age:", minAge);

        console.log("\n=== FRONTEND CONFIGURATION ===");
        console.log("Update your frontend with:");
        console.log("CONFIG_ID:", vm.toString(configId));
        console.log("MINIMUM_AGE: 18");
        console.log("EXCLUDED_COUNTRIES: []");
        console.log("OFAC: false");

        console.log("\nConfiguration setup completed successfully!");
    }
}
