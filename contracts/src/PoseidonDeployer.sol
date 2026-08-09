// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Deploys the circomlibjs-generated Poseidon EVM bytecode (init code)
///         via CREATE and returns the address. Used by the deploy script and
///         tests to stand up the PoseidonT3 (hash_2) / PoseidonT5 (hash_4)
///         contracts the registry depends on. Bytecode: contracts/poseidon/*.bin.
library PoseidonDeployer {
    error PoseidonDeployFailed();

    function deploy(bytes memory initcode) internal returns (address addr) {
        assembly {
            addr := create(0, add(initcode, 0x20), mload(initcode))
        }
        if (addr == address(0)) revert PoseidonDeployFailed();
    }
}
