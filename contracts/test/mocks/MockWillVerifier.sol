// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IWillVerifier} from "../../src/InheritanceRegistry.sol";

/// @notice Always-true verifier, used only to isolate registry logic (e.g. the
///         claim reentrancy guard) in tests where a real proof for an arbitrary
///         beneficiary set cannot be generated. The real proof path is covered
///         by the fixture-backed tests using the genuine HonkVerifier.
contract MockWillVerifier is IWillVerifier {
    function verifyWillProof(
        bytes calldata,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    ) external pure returns (bool) {
        return true;
    }
}
