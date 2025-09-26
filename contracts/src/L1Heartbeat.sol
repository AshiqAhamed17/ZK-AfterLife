// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract L1Heartbeat is Ownable, Pausable {

    constructor() Ownable(msg.sender) {}
}