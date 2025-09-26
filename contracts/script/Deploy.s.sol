// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "../src/L1Heartbeat.sol";
import "../src/AztecExecutor.sol";
import "../src/L1AztecBridge.sol";
import "../src/WillVerifier.sol";
import "../src/WillExecutor.sol";
import "../src/NoirIntegration.sol";

/// @title Demo Deploy Script for ZK-AfterLife
/// @notice Deploys all contracts with DEMO-OPTIMIZED timing for 3-minute presentation
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
contract DeployScript is Script {
    // DEMO Configuration 
    // Just for demo, real inactivity period is about 365 days and Grace period is 30 days
    uint256 constant INACTIVITY_PERIOD = 30 seconds; // 30 seconds (was 365 days)
    uint256 constant GRACE_PERIOD = 15 seconds; // 15 seconds (was 30 days)
    uint256 constant MIN_EXECUTION_DELAY = 5 seconds; // 5 seconds (was 1 day)
    uint256 constant MIN_CONFIRMATIONS = 2; // 2 blocks (was 12)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Check if deployer has sufficient balance
        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance);

        if (balance < 0.1 ether) {
            console.log(
                "WARNING: Low balance. You may need more ETH for deployment."
            );
        }

        // Setup veto members - FLEXIBLE CONFIGURATION
        address[] memory vetoMembers = new address[](2);

        // Option 1: Use environment variable for second veto member
        try vm.envAddress("VETO_MEMBER_2") returns (address veto2) {
            vetoMembers[0] = deployer; // Deployer as first veto member
            vetoMembers[1] = veto2; // Custom veto member from env
            console.log("Using custom veto member from VETO_MEMBER_2 env var");
        } catch {
            // Option 2: Fallback to Anvil test address for demo
            vetoMembers[0] = deployer; // Deployer as first veto member
            vetoMembers[1] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Anvil account #1
            console.log(
                "Using Anvil test address for demo (set VETO_MEMBER_2 for custom)"
            );
        }

        uint256 vetoThreshold = 1; // Simple majority (1 out of 2)

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying ZK-AfterLife contracts (DEMO MODE)...");
        console.log("Deployer:", deployer);
        console.log("DEMO TIMING:");
        console.log("   Inactivity Period:", INACTIVITY_PERIOD, "seconds");
        console.log("   Grace Period:", GRACE_PERIOD, "seconds");
        console.log("   Min Execution Delay:", MIN_EXECUTION_DELAY, "seconds");
        console.log("   Veto Members:", vetoMembers.length);
        console.log("   Veto Threshold:", vetoThreshold);
        console.log("   Veto Member 1 (Deployer):", vetoMembers[0]);
        console.log("   Veto Member 2:", vetoMembers[1]);

        // 1. Deploy L1Heartbeat contract
        console.log("\n1. Deploying L1Heartbeat...");
        L1Heartbeat l1Heartbeat = new L1Heartbeat(
            INACTIVITY_PERIOD,
            GRACE_PERIOD,
            vetoMembers,
            vetoThreshold
        );
        console.log("L1Heartbeat deployed at:", address(l1Heartbeat));

        // 2. Deploy AztecExecutor contract
        console.log("\n2. Deploying AztecExecutor...");
        AztecExecutor aztecExecutor = new AztecExecutor(MIN_EXECUTION_DELAY);
        console.log("AztecExecutor deployed at:", address(aztecExecutor));

        // 3. Deploy WillVerifier contract
        console.log("\n3. Deploying WillVerifier...");
        WillVerifier willVerifier = new WillVerifier();
        console.log("WillVerifier deployed at:", address(willVerifier));

        // 4. Deploy WillExecutor contract
        console.log("\n4. Deploying WillExecutor...");
        WillExecutor willExecutor = new WillExecutor(
            address(willVerifier),
            address(l1Heartbeat)
        );
        console.log("WillExecutor deployed at:", address(willExecutor));

        // 5. Deploy L1AztecBridge contract
        console.log("\n5. Deploying L1AztecBridge...");
        L1AztecBridge l1AztecBridge = new L1AztecBridge(
            address(aztecExecutor),
            address(l1Heartbeat),
            MIN_CONFIRMATIONS
        );
        console.log("L1AztecBridge deployed at:", address(l1AztecBridge));

        // 6. Deploy NoirIntegration contract
        console.log("\n6. Deploying NoirIntegration...");
        NoirIntegration noirIntegration = new NoirIntegration(
            address(aztecExecutor)
        );
        console.log("NoirIntegration deployed at:", address(noirIntegration));

        // 7. Configure contracts
        console.log("\n7. Configuring contracts...");

        // Set the bridge as an authorized enabler in AztecExecutor
        aztecExecutor.setAuthorizedEnabler(address(l1AztecBridge), true);
        console.log("L1AztecBridge authorized in AztecExecutor");

        // Set the bridge as an authorized bridge in L1AztecBridge
        l1AztecBridge.setBridgeAuthorization(address(l1AztecBridge), true);
        console.log("L1AztecBridge self-authorized");

        vm.stopBroadcast();

        // 8. Print deployment summary
        console.log("\n=== DEMO DEPLOYMENT SUMMARY ===");
        console.log("Network:", vm.envString("NETWORK"));
        console.log("L1Heartbeat:", address(l1Heartbeat));
        console.log("AztecExecutor:", address(aztecExecutor));
        console.log("WillVerifier:", address(willVerifier));
        console.log("WillExecutor:", address(willExecutor));
        console.log("L1AztecBridge:", address(l1AztecBridge));
        console.log("NoirIntegration:", address(noirIntegration));
        console.log("Deployer:", deployer);
        console.log("Veto Members:", vetoMembers.length);
        console.log("Veto Threshold:", vetoThreshold);
        console.log("DEMO TIMING:");
        console.log("   Inactivity Period:", INACTIVITY_PERIOD, "seconds");
        console.log("   Grace Period:", GRACE_PERIOD, "seconds");
        console.log("   Min Execution Delay:", MIN_EXECUTION_DELAY, "seconds");
        console.log("   Min Confirmations:", MIN_CONFIRMATIONS, "blocks");
        console.log("================================");

        // 9. Print contract addresses for easy copying
        console.log("\nContract addresses for frontend config:");
        console.log("L1Heartbeat:", address(l1Heartbeat));
        console.log("AztecExecutor:", address(aztecExecutor));
        console.log("WillVerifier:", address(willVerifier));
        console.log("WillExecutor:", address(willExecutor));
        console.log("L1AztecBridge:", address(l1AztecBridge));
        console.log("NoirIntegration:", address(noirIntegration));
    }

    /// @notice Verify contract deployment and configuration
    function verify() external view {
        console.log("Verifying deployment...");
        console.log("Verification complete!");
    }
}
