// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {InheritanceRegistry} from "../../src/InheritanceRegistry.sol";

/// @notice A malicious beneficiary that tries to re-enter `claim` when it
///         receives its ETH payout. Used to prove the registry's reentrancy
///         guard (and checks-effects-interactions) prevent a double payout.
contract ReentrantBeneficiary {
    InheritanceRegistry public registry;
    bytes32 public commitment;
    uint256 public ethAmount;
    uint256 public usdcAmount;
    uint256 public leafIndex;
    bytes32[3] public siblings;
    bool public reentered;

    function configure(
        InheritanceRegistry _registry,
        bytes32 _commitment,
        uint256 _ethAmount,
        uint256 _usdcAmount,
        uint256 _leafIndex,
        bytes32[3] calldata _siblings
    ) external {
        registry = _registry;
        commitment = _commitment;
        ethAmount = _ethAmount;
        usdcAmount = _usdcAmount;
        leafIndex = _leafIndex;
        siblings = _siblings;
    }

    function attack() external {
        registry.claim(commitment, ethAmount, usdcAmount, leafIndex, siblings);
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            // Attempt a reentrant claim; the guard must make this fail. Swallow
            // the revert so the outer (legitimate) claim can still complete —
            // proving the attacker still gets exactly one share, never two.
            try
                registry.claim(commitment, ethAmount, usdcAmount, leafIndex, siblings)
            {} catch {}
        }
    }
}
