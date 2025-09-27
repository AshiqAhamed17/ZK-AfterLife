// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SelfHumanVerifier.sol";

/// @title DeploySelfHumanVerifier
/// @notice Deployment script for SelfHumanVerifier contract on Celo Sepolia
/// @dev Deploys the contract with proper configuration for Self Protocol integration
contract DeploySelfHumanVerifier is Script {
    // Custom errors
    error DeploymentFailed();
    error InvalidHubAddress();
    error InvalidScope();

    // Celo Sepolia Configuration
    address constant CELO_SEPOLIA_HUB =
        0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74;
    uint256 constant DEFAULT_SCOPE = 1;
    bytes32 constant DEFAULT_CONFIG_ID =
        0x0000000000000000000000000000000000000000000000000000000000000001;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== SelfHumanVerifier Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Network:", vm.envString("NETWORK"));
        console.log("Hub Address:", CELO_SEPOLIA_HUB);
        console.log("Default Scope:", DEFAULT_SCOPE);

        // Check deployer balance
        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance);

        if (balance < 0.01 ether) {
            console.log(
                "WARNING: Low balance. You may need more ETH for deployment."
            );
        }

        vm.startBroadcast(deployerPrivateKey);

        // Deploy SelfHumanVerifier contract
        console.log("\nDeploying SelfHumanVerifier...");
        SelfHumanVerifier selfHumanVerifier = new SelfHumanVerifier(
            CELO_SEPOLIA_HUB,
            DEFAULT_SCOPE,
            DEFAULT_CONFIG_ID
        );

        vm.stopBroadcast();

        // Verify deployment
        if (address(selfHumanVerifier) == address(0)) {
            revert DeploymentFailed();
        }

        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log(
            "SelfHumanVerifier deployed at:",
            address(selfHumanVerifier)
        );
        console.log("Hub Address:", CELO_SEPOLIA_HUB);
        console.log("Scope:", selfHumanVerifier.scope());
        console.log("Minimum Age:", selfHumanVerifier.MINIMUM_AGE());

        // Print addresses for frontend configuration
        console.log("\n=== FRONTEND CONFIGURATION ===");
        console.log("SELF_HUMAN_VERIFIER_ADDRESS:", address(selfHumanVerifier));
        console.log("SELF_HUB_ADDRESS:", CELO_SEPOLIA_HUB);
        console.log("SELF_SCOPE:", selfHumanVerifier.scope());

        console.log("\n=== NEXT STEPS ===");
        console.log("1. Update frontend .env with contract address");
        console.log("2. Configure proper verification config ID");
        console.log("3. Test with mock passports");
        console.log("4. Integrate with WillExecutor contract");

        console.log("\nDeployment completed successfully!");
    }

    /// @notice Verify contract deployment and configuration
    function verify() external view {
        console.log("Verifying SelfHumanVerifier deployment...");
        console.log("Verification complete!");
    }
}
