// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title L1Heartbeat
/// @notice Ethereum-side watchdog for zk-afterlife-agent.
/// @dev Tracks owner activity, manages grace/veto flow, and emits execution signals.
///      This contract does NOT hold funds or beneficiaries it only determines
///      when the will can be executed privately on Aztec.
/// @custom:security-contact security@infiniteaudits.io
contract L1Heartbeat is Ownable, Pausable {
    ////////////// ERRORS //////////////

    // Constructor validation
    error InvalidInactivityPeriod();
    error InvalidGracePeriod();
    error NoVetoMembers();
    error InvalidVetoThreshold();
    error ZeroAddressVeto();
    error DuplicateVetoMember();

    // Grace / veto flow
    error StillActive();
    error GraceAlreadyStarted();
    error GraceNotStarted();
    error GracePeriodOver();
    error AlreadyVetoed();
    error NotVetoMember();

    // Finalization
    error AlreadyFinalized();
    error GraceStillActive();
    error ExecutionVetoed();

    ////////////// STORAGE //////////////

    /// @notice Number of seconds until the owner is considered inactive
    uint256 public immutable inactivityPeriod;

    /// @notice Grace buffer (in seconds) after inactivity is detected
    uint256 public immutable gracePeriod;

    /// @notice Last timestamp when owner checked in
    uint256 public lastCheckIn;

    /// @notice Timestamp when grace period started (0 if not started)
    uint256 public graceStart;

    /// @notice Whether inactivity has been finalized (execution signal emitted)
    bool public inactiveFinalized;

    /// @notice Mapping of addresses allowed to veto execution
    mapping(address => bool) public isVetoMember;

    /// @notice List of veto member addresses (for reference / off-chain reads)
    address[] private _vetoList;

    /// @notice Minimum number of vetoes required to block execution
    uint256 public immutable vetoThreshold;

    /// @notice Number of vetoes actually cast in current grace period
    uint256 public vetoCount;

    /// @notice Track which veto members have already vetoed
    mapping(address => bool) public hasVetoed;

    ////////////// EVENTS //////////////

    event CheckIn(address indexed owner, uint256 timestamp);
    event GraceStarted(uint256 startTime, uint256 endTime);
    event Veto(address indexed member, uint256 timestamp);
    event InactiveFinalized(bytes32 willCommitment, uint256 timestamp);

    ////////////// MODIFIERS //////////////

    modifier vetoOnly() {
        if (!isVetoMember[msg.sender]) revert NotVetoMember();
        _;
    }

    ////////////// CONSTRUCTOR //////////////

    constructor(
        uint256 _inactivityPeriod,
        uint256 _gracePeriod,
        address[] memory _vetoMembers,
        uint256 _vetoThreshold
    ) Ownable(msg.sender) {
        if (_inactivityPeriod == 0) revert InvalidInactivityPeriod();
        if (_gracePeriod == 0) revert InvalidGracePeriod();
        if (_vetoMembers.length == 0) revert NoVetoMembers();
        if (_vetoThreshold == 0 || _vetoThreshold > _vetoMembers.length) {
            revert InvalidVetoThreshold();
        }

        inactivityPeriod = _inactivityPeriod;
        gracePeriod = _gracePeriod;
        lastCheckIn = block.timestamp;
        vetoThreshold = _vetoThreshold;

        for (uint i = 0; i < _vetoMembers.length; i++) {
            address member = _vetoMembers[i];
            if (member == address(0)) revert ZeroAddressVeto();
            if (isVetoMember[member]) revert DuplicateVetoMember();
            isVetoMember[member] = true;
            _vetoList.push(member);
        }
    }

    ////////////// OWNER EMERGENCY FUNCTIONS //////////////

    /// @notice Pause contract (emergency circuit breaker)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause contract
    function unpause() external onlyOwner {
        _unpause();
    }

    ////////////// EXTERNAL FUNCTIONS //////////////

    /// @notice Owner pings the contract to prove activity
    function checkIn() external onlyOwner whenNotPaused {
        lastCheckIn = block.timestamp;
        emit CheckIn(msg.sender, block.timestamp);
    }

    /// @notice Trigger grace period if owner has been inactive long enough
    function triggerGracePeriod() external whenNotPaused {
        if (block.timestamp <= lastCheckIn + inactivityPeriod)
            revert StillActive();
        if (graceStart != 0) revert GraceAlreadyStarted();

        graceStart = block.timestamp;
        emit GraceStarted(graceStart, graceStart + gracePeriod);
    }

    /// @notice Cast a veto during the grace period
    function veto() external vetoOnly whenNotPaused {
        if (graceStart == 0) revert GraceNotStarted();
        if (block.timestamp > graceStart + gracePeriod)
            revert GracePeriodOver();
        if (hasVetoed[msg.sender]) revert AlreadyVetoed();

        hasVetoed[msg.sender] = true;
        vetoCount++;
        emit Veto(msg.sender, block.timestamp);
    }

    /**
     * @notice Finalize inactivity and emit signal for Aztec executor
     * @param willCommitment Commitment hash of the will (off-chain/Noir generated)
     */
    function finalizeInactivity(bytes32 willCommitment) external whenNotPaused {
        if (inactiveFinalized) revert AlreadyFinalized();
        if (graceStart == 0) revert GraceNotStarted();
        if (block.timestamp <= graceStart + gracePeriod)
            revert GraceStillActive();
        if (vetoCount >= vetoThreshold) revert ExecutionVetoed();

        inactiveFinalized = true;
        emit InactiveFinalized(willCommitment, block.timestamp);
    }

    ////////////// VIEW FUNCTIONS //////////////

    /// @notice Returns all veto members (read-only convenience)
    function getVetoMembers() external view returns (address[] memory) {
        return _vetoList;
    }
}
