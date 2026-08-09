// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Deploys the circomlibjs-generated Poseidon EVM bytecode (init code)
///         via CREATE. Used by tests and deploy scripts to stand up the
///         PoseidonT3 (hash_2) / PoseidonT5 (hash_4) contracts the registry
///         depends on. Bytecode lives in contracts/poseidon/*.bin.
library PoseidonDeployer {
    function deploy(bytes memory initcode) internal returns (address addr) {
        assembly {
            addr := create(0, add(initcode, 0x20), mload(initcode))
        }
        require(addr != address(0), "poseidon deploy failed");
    }
}
