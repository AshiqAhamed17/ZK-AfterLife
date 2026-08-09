// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISelfHumanVerifier} from "../../src/InheritanceRegistry.sol";

/// @notice Test double for the Self humanity+age gate; verification is toggleable.
contract MockSelfVerifier is ISelfHumanVerifier {
    mapping(address => bool) public verified;

    function setVerified(address user, bool value) external {
        verified[user] = value;
    }

    function isFullyVerified(address user) external view returns (bool) {
        return verified[user];
    }
}
