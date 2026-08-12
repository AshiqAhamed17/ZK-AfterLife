# Per-Will Configuration (Timing + Veto Committee) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `InheritanceRegistry`'s `inactivityPeriod`, `gracePeriod`, `vetoThreshold`, and veto committee from constructor immutables shared by every will to per-will parameters chosen by each owner at `register()` time.

**Architecture:** Extend the existing `Will` struct with the four new fields (no second config struct/mapping); shrink the constructor to just the 5 external dependency addresses; move all timing/veto validation from the constructor into `register()`; every lifecycle function reads `w.inactivityPeriod`/`w.gracePeriod`/`w.vetoThreshold`/`w.vetoMembers` off the will it's operating on instead of a contract-wide immutable.

**Tech Stack:** Solidity 0.8.28 / Foundry (contracts), Next.js 14 + viem (frontend), Playwright-driven Chrome (E2E harness).

## Global Constraints

- Design doc: `docs/superpowers/specs/2026-08-12-per-will-config-design.md` — every task's requirements implicitly include it.
- `MIN_INACTIVITY_PERIOD = 60` seconds, `MIN_GRACE_PERIOD = 60` seconds, `MAX_VETO_MEMBERS = 8` — hardcoded contract constants, not deploy-time parameters.
- Veto committee is fixed at registration — no update function, ever (per spec's explicit out-of-scope call).
- No maximum bound on inactivity/grace periods — only a minimum.
- The circuit (`noir/will/src/main.nr`) is never touched by this plan.
- `wills` mapping changes from `public` to `private` (Solidity's auto-getter silently drops array-typed struct members — the hand-written `getWill()` becomes the only way to read a will; the frontend already exclusively calls `getWill()`, never the auto-getter).

---

### Task 1: InheritanceRegistry.sol — per-will config

**Files:**
- Modify: `contracts/src/InheritanceRegistry.sol`

**Interfaces:**
- Produces: `Will` struct gains `uint64 inactivityPeriod`, `uint64 gracePeriod`, `uint8 vetoThreshold`, `address[] vetoMembers`. Constructor becomes `(address _willVerifier, address _selfVerifier, address _usdc, address _poseidonT3, address _poseidonT5)`. `register()` gains `uint256 inactivityPeriod, uint256 gracePeriod, address[] calldata vetoMembers, uint256 vetoThreshold` after `totalNftCount`. New view `isVetoMemberOf(bytes32 willCommitment, address who) external view returns (bool)`. Removed: `getVetoMembers()`, `isVetoMember(address)`, the `inactivityPeriod`/`gracePeriod`/`vetoThreshold` immutables, the `isVetoMember` mapping, the `_vetoMembers` array. New errors: `InactivityPeriodTooShort()`, `GracePeriodTooShort()`, `TooManyVetoMembers()`. Removed errors: `InvalidInactivityPeriod()`, `InvalidGracePeriod()` (constructor-only, no longer reachable).

- [ ] **Step 1: Replace the struct, immutables, and storage sections**

Replace lines 49–96 (the `Will` struct through the `_vetoMembers` declaration) with:

```solidity
    struct Will {
        address owner;
        uint256 merkleRoot;
        uint256 totalEth;
        uint256 totalUsdc;
        uint64 registeredAt;
        uint64 lastCheckIn;
        uint64 graceStart; // 0 = no active grace
        uint32 graceEpoch; // bumped whenever grace resets; scopes veto rounds
        uint32 vetoCount; // vetoes cast in the current epoch
        bool executed;
        bool exists;
        uint64 inactivityPeriod; // seconds of owner inactivity before grace can be triggered
        uint64 gracePeriod; // grace buffer (seconds) after inactivity during which vetoes apply
        uint8 vetoThreshold; // minimum vetoes that cancel a grace period ("false alarm")
        address[] vetoMembers; // this will's own trusted circle, fixed at registration
    }

    ////////////// CONSTANTS //////////////

    /// @notice Floor on owner-chosen inactivity/grace periods — guards against
    ///         an accidental or malicious near-zero window, not a realistic
    ///         default (real wills should choose months/years).
    uint256 public constant MIN_INACTIVITY_PERIOD = 60;
    uint256 public constant MIN_GRACE_PERIOD = 60;

    /// @notice Cap on a will's veto committee size, matching the beneficiary
    ///         cap, so register()/veto() gas cost stays bounded and predictable.
    uint256 public constant MAX_VETO_MEMBERS = 8;

    ////////////// IMMUTABLES //////////////

    /// @notice Real UltraHonk proof verifier (WillVerifier -> HonkVerifier).
    IWillVerifier public immutable willVerifier;

    /// @notice Self Protocol humanity + age gate.
    ISelfHumanVerifier public immutable selfVerifier;

    /// @notice The single ERC20 (mock USDC) this registry escrows alongside ETH.
    IERC20 public immutable usdc;

    /// @notice Poseidon hash_2 (t=3), circomlib-compatible with the will circuit.
    IPoseidonT3 public immutable poseidonT3;

    /// @notice Poseidon hash_4 (t=5), circomlib-compatible with the will circuit.
    IPoseidonT5 public immutable poseidonT5;

    ////////////// STORAGE //////////////

    /// @notice will commitment => will record. Private: `Will` now contains a
    ///         dynamic array member, which Solidity's auto-generated public
    ///         getter would silently drop from its return tuple. `getWill()`
    ///         below is the only supported read path.
    mapping(bytes32 => Will) private wills;
```

- [ ] **Step 2: Update the error list**

Replace lines 133–144 (the constructor/registration error group) with:

```solidity
    error InvalidVerifier();
    error InvalidSelfVerifier();
    error InvalidToken();
    error InvalidPoseidon();
    error InactivityPeriodTooShort();
    error GracePeriodTooShort();
    error NoVetoMembers();
    error TooManyVetoMembers();
    error InvalidVetoThreshold();
    error ZeroAddressVeto();
    error DuplicateVetoMember();
```

- [ ] **Step 3: Shrink the constructor**

Replace lines 172–214 (the whole `CONSTRUCTOR` section) with:

```solidity
    ////////////// CONSTRUCTOR //////////////

    constructor(
        address _willVerifier,
        address _selfVerifier,
        address _usdc,
        address _poseidonT3,
        address _poseidonT5
    ) {
        if (_willVerifier == address(0)) revert InvalidVerifier();
        if (_selfVerifier == address(0)) revert InvalidSelfVerifier();
        if (_usdc == address(0)) revert InvalidToken();
        if (_poseidonT3 == address(0) || _poseidonT5 == address(0)) {
            revert InvalidPoseidon();
        }

        willVerifier = IWillVerifier(_willVerifier);
        selfVerifier = ISelfHumanVerifier(_selfVerifier);
        usdc = IERC20(_usdc);
        poseidonT3 = IPoseidonT3(_poseidonT3);
        poseidonT5 = IPoseidonT5(_poseidonT5);
    }
```

- [ ] **Step 4: Rewrite `register()` with per-will config + validation**

Replace the `register` function (originally lines 231–265) with:

```solidity
    /**
     * @notice Seal a will: escrow ETH + USDC equal to the declared totals,
     *         record the commitment/Merkle root/totals, and set this will's
     *         own inactivity period, grace period, and trusted veto circle.
     *         Self-gated.
     * @dev The caller must have deposited exactly `totalEth` as msg.value and
     *      pre-approved `totalUsdc` to this contract. NFTs are not supported in
     *      V1, so `totalNftCount` must be 0. `vetoMembers`/`vetoThreshold` are
     *      fixed for this will's lifetime — there is no update function.
     * @param willCommitment Poseidon commitment of the will payload + salt (a
     *        BN254 field element), used as the will's key.
     * @param merkleRoot Poseidon Merkle root over the beneficiary leaves.
     * @param totalEth Declared total ETH allocation (must equal msg.value).
     * @param totalUsdc Declared total USDC allocation (pulled via transferFrom).
     * @param totalNftCount Declared NFT count; must be 0 in V1.
     * @param inactivityPeriod Seconds of inactivity before grace can be triggered;
     *        must be >= MIN_INACTIVITY_PERIOD.
     * @param gracePeriod Grace buffer in seconds; must be >= MIN_GRACE_PERIOD.
     * @param vetoMembers This will's trusted circle (1-MAX_VETO_MEMBERS addresses,
     *        no zero address, no duplicates).
     * @param vetoThreshold Vetoes needed to cancel a grace period; 1-vetoMembers.length.
     */
    function register(
        bytes32 willCommitment,
        uint256 merkleRoot,
        uint256 totalEth,
        uint256 totalUsdc,
        uint256 totalNftCount,
        uint256 inactivityPeriod,
        uint256 gracePeriod,
        address[] calldata vetoMembers,
        uint256 vetoThreshold
    ) external payable {
        if (!selfVerifier.isFullyVerified(msg.sender)) revert NotVerifiedHuman();
        if (wills[willCommitment].exists) revert WillAlreadyRegistered();
        if (merkleRoot == 0) revert InvalidMerkleRoot();
        if (totalNftCount != 0) revert NftsNotSupported();
        if (totalEth == 0 && totalUsdc == 0) revert EmptyWill();
        if (msg.value != totalEth) revert EthDepositMismatch();
        if (inactivityPeriod < MIN_INACTIVITY_PERIOD) revert InactivityPeriodTooShort();
        if (gracePeriod < MIN_GRACE_PERIOD) revert GracePeriodTooShort();
        if (vetoMembers.length == 0) revert NoVetoMembers();
        if (vetoMembers.length > MAX_VETO_MEMBERS) revert TooManyVetoMembers();
        if (vetoThreshold == 0 || vetoThreshold > vetoMembers.length) {
            revert InvalidVetoThreshold();
        }

        address[] memory members = new address[](vetoMembers.length);
        for (uint256 i = 0; i < vetoMembers.length; i++) {
            address member = vetoMembers[i];
            if (member == address(0)) revert ZeroAddressVeto();
            for (uint256 j = 0; j < i; j++) {
                if (members[j] == member) revert DuplicateVetoMember();
            }
            members[i] = member;
        }

        wills[willCommitment] = Will({
            owner: msg.sender,
            merkleRoot: merkleRoot,
            totalEth: totalEth,
            totalUsdc: totalUsdc,
            registeredAt: uint64(block.timestamp),
            lastCheckIn: uint64(block.timestamp),
            graceStart: 0,
            graceEpoch: 0,
            vetoCount: 0,
            executed: false,
            exists: true,
            inactivityPeriod: uint64(inactivityPeriod),
            gracePeriod: uint64(gracePeriod),
            vetoThreshold: uint8(vetoThreshold),
            vetoMembers: members
        });

        // Interaction last. Pulls exactly the declared USDC total (no-op if 0).
        if (totalUsdc > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), totalUsdc);
        }

        emit WillRegistered(willCommitment, msg.sender, totalEth, totalUsdc);
    }
```

- [ ] **Step 5: Update `triggerGracePeriod`, `veto`, and `executeWill` to read per-will config**

Replace `triggerGracePeriod` (originally lines 289–304) with:

```solidity
    /// @notice Anyone may open the grace period once the owner has been inactive
    ///         for this will's own `inactivityPeriod`.
    function triggerGracePeriod(bytes32 willCommitment) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart != 0) revert GraceAlreadyActive();
        if (block.timestamp <= uint256(w.lastCheckIn) + w.inactivityPeriod) {
            revert StillActive();
        }

        w.graceStart = uint64(block.timestamp);
        emit GraceStarted(
            willCommitment,
            block.timestamp,
            block.timestamp + w.gracePeriod
        );
    }
```

Replace `veto` (originally lines 309–333) with:

```solidity
    /// @notice A member of this will's own trusted circle blocks a premature
    ///         execution during the grace window. Reaching `vetoThreshold` is
    ///         treated as a confirmed false alarm: grace is cancelled and the
    ///         inactivity clock restarts.
    function veto(bytes32 willCommitment) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (!_isVetoMemberOf(w, msg.sender)) revert NotVetoMember();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart == 0) revert GraceNotStarted();
        if (block.timestamp > uint256(w.graceStart) + w.gracePeriod) {
            revert GracePeriodOver();
        }
        if (hasVetoed[willCommitment][w.graceEpoch][msg.sender]) {
            revert AlreadyVetoed();
        }

        hasVetoed[willCommitment][w.graceEpoch][msg.sender] = true;
        w.vetoCount += 1;
        emit Vetoed(willCommitment, msg.sender, w.vetoCount);

        if (w.vetoCount >= w.vetoThreshold) {
            w.graceStart = 0;
            w.vetoCount = 0;
            w.graceEpoch += 1;
            w.lastCheckIn = uint64(block.timestamp);
            emit GraceCancelled(willCommitment);
        }
    }

    /// @notice Linear scan of a will's own (<=8-member) trusted circle.
    function _isVetoMemberOf(Will storage w, address who) internal view returns (bool) {
        for (uint256 i = 0; i < w.vetoMembers.length; i++) {
            if (w.vetoMembers[i] == who) return true;
        }
        return false;
    }
```

In `executeWill` (originally lines 339–360), change the two `gracePeriod` reads to `w.gracePeriod`:

```solidity
    function executeWill(bytes32 willCommitment, bytes calldata proof) external {
        Will storage w = wills[willCommitment];
        if (!w.exists) revert WillNotRegistered();
        if (w.executed) revert WillAlreadyExecuted();
        if (w.graceStart == 0) revert GraceNotStarted();
        if (block.timestamp <= uint256(w.graceStart) + w.gracePeriod) {
            revert GraceNotElapsed();
        }

        bool ok = willVerifier.verifyWillProof(
            proof,
            uint256(willCommitment),
            w.merkleRoot,
            w.totalEth,
            w.totalUsdc,
            0 // total_nft_count is always 0 in V1 (enforced at register)
        );
        if (!ok) revert InvalidProof();

        w.executed = true;
        emit WillExecuted(willCommitment, msg.sender);
    }
```

(`checkIn` is unchanged — it never referenced inactivity/grace/veto.)

- [ ] **Step 6: Replace the `VIEWS` section**

Replace lines 426–436 with:

```solidity
    ////////////// VIEWS //////////////

    /// @notice Full will record for a commitment, including its own timing
    ///         and trusted-circle configuration.
    function getWill(bytes32 willCommitment) external view returns (Will memory) {
        return wills[willCommitment];
    }

    /// @notice Whether `who` is on this specific will's trusted circle.
    function isVetoMemberOf(bytes32 willCommitment, address who) external view returns (bool) {
        return _isVetoMemberOf(wills[willCommitment], who);
    }
```

- [ ] **Step 7: Build and confirm it compiles**

Run: `cd contracts && forge build`
Expected: `Compiler run successful!` (existing lint warnings about `block.timestamp` comparisons and the HonkVerifier unsafe-typecast are pre-existing and unrelated — fine to see them, no new errors).

- [ ] **Step 8: Commit**

```bash
cd contracts
git add src/InheritanceRegistry.sol
git commit -m "feat(contracts): move inactivity/grace/veto config to per-will register() params"
```

---

### Task 2: InheritanceRegistry.t.sol — rewrite tests for per-will config

**Files:**
- Modify: `contracts/test/InheritanceRegistry.t.sol`

**Interfaces:**
- Consumes: Task 1's `register(bytes32, uint256, uint256, uint256, uint256, uint256, uint256, address[], uint256)`, `Will` struct with the 4 new fields, `isVetoMemberOf(bytes32, address)`, `InactivityPeriodTooShort()`, `GracePeriodTooShort()`, `TooManyVetoMembers()` errors, and the 5-arg constructor.

- [ ] **Step 1: Add a `_defaultVetoMembers()` helper and update `setUp()`**

In `setUp()` (originally lines 53–103), replace the registry construction block:

```solidity
        address[] memory vetoMembers = new address[](2);
        vetoMembers[0] = alice;
        vetoMembers[1] = bob;

        registry = new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            address(poseidonT3),
            address(poseidonT5),
            INACTIVITY,
            GRACE,
            vetoMembers,
            VETO_THRESHOLD
        );
```

with:

```solidity
        registry = new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            address(poseidonT3),
            address(poseidonT5)
        );
```

Add this helper right after `setUp()` closes (after the `require(pi[4] == 0, ...)` line, before `_registerFixtureWill`):

```solidity
    /// This registry's default two-member committee used by most tests.
    function _defaultVetoMembers() internal view returns (address[] memory members) {
        members = new address[](2);
        members[0] = alice;
        members[1] = bob;
    }
```

- [ ] **Step 2: Update `_registerFixtureWill()` and `_register()`**

Replace `_registerFixtureWill()`:

```solidity
    /// Register the fixture-backed will as `owner` (totals match the proof).
    function _registerFixtureWill() internal {
        vm.startPrank(owner);
        usdc.approve(address(registry), fxUsdc);
        registry.register{value: fxEth}(
            fxCommitment, fxRoot, fxEth, fxUsdc, 0,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
        vm.stopPrank();
    }
```

Replace `_register()`:

```solidity
    /// Register the standard test will as `owner`. Returns nothing; reverts propagate.
    function _register() internal {
        vm.startPrank(owner);
        usdc.approve(address(registry), TOTAL_USDC);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT,
            MERKLE_ROOT,
            TOTAL_ETH,
            TOTAL_USDC,
            0,
            INACTIVITY,
            GRACE,
            _defaultVetoMembers(),
            VETO_THRESHOLD
        );
        vm.stopPrank();
    }
```

(`_reachExecutable()` and `_registerAndExecute()` are unchanged — they call the helpers above, which now absorb the new signature.)

- [ ] **Step 3: Update the direct `registry.register(...)` calls in the existing REGISTER tests**

In each of these six tests, append `, INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD` to the existing `register(...)` call's argument list (the call itself is otherwise unchanged):

```solidity
    function test_RegisterRevertsIfNotVerified() public {
        vm.deal(anyone, 100 ether);
        vm.prank(anyone);
        vm.expectRevert(InheritanceRegistry.NotVerifiedHuman.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
    }

    function test_RegisterRevertsOnEthMismatch() public {
        vm.startPrank(owner);
        usdc.approve(address(registry), TOTAL_USDC);
        vm.expectRevert(InheritanceRegistry.EthDepositMismatch.selector);
        registry.register{value: TOTAL_ETH - 1}(
            COMMITMENT,
            MERKLE_ROOT,
            TOTAL_ETH,
            TOTAL_USDC,
            0,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
        vm.stopPrank();
    }

    function test_RegisterRevertsOnNfts() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.NftsNotSupported.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 1,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
    }

    function test_RegisterRevertsOnZeroMerkleRoot() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.InvalidMerkleRoot.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, 0, TOTAL_ETH, 0, 0,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
    }

    function test_RegisterRevertsOnEmptyWill() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.EmptyWill.selector);
        registry.register{value: 0}(
            COMMITMENT, MERKLE_ROOT, 0, 0, 0,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
    }

    function test_RegisterRevertsOnDuplicate() public {
        _register();
        vm.startPrank(owner);
        usdc.approve(address(registry), TOTAL_USDC);
        vm.expectRevert(InheritanceRegistry.WillAlreadyRegistered.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT,
            MERKLE_ROOT,
            TOTAL_ETH,
            TOTAL_USDC,
            0,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
        vm.stopPrank();
    }

    function test_RegisterRevertsIfUsdcNotApproved() public {
        vm.startPrank(owner);
        // no approve()
        vm.expectRevert(); // SafeERC20 wraps the transferFrom failure
        registry.register{value: TOTAL_ETH}(
            COMMITMENT,
            MERKLE_ROOT,
            TOTAL_ETH,
            TOTAL_USDC,
            0,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
        vm.stopPrank();
    }

    function test_RegisterEthOnlyWill() public {
        vm.prank(owner);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            INACTIVITY, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
        assertEq(address(registry).balance, TOTAL_ETH);
        assertEq(usdc.balanceOf(address(registry)), 0);
    }
```

- [ ] **Step 4: Replace the CONSTRUCTOR test section**

Replace `test_ConstructorRejectsZeroVerifier` and delete `test_ConstructorRejectsBadVetoThreshold` entirely (threshold validation moved to `register()` — covered by a new test in Step 5). Replace the whole `//////////////// CONSTRUCTOR ////////////////` section with:

```solidity
    //////////////// CONSTRUCTOR ////////////////

    function test_ConstructorRejectsZeroVerifier() public {
        vm.expectRevert(InheritanceRegistry.InvalidVerifier.selector);
        new InheritanceRegistry(
            address(0),
            address(self),
            address(usdc),
            address(poseidonT3),
            address(poseidonT5)
        );
    }
```

- [ ] **Step 5: Add new register()-level validation tests**

Add these after the CONSTRUCTOR section (before `//////////////// EXECUTE ////////////////`):

```solidity
    //////////////// REGISTER VALIDATION (per-will config) ////////////////

    function test_RegisterRevertsOnShortInactivity() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.InactivityPeriodTooShort.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            59, GRACE, _defaultVetoMembers(), VETO_THRESHOLD
        );
    }

    function test_RegisterRevertsOnShortGrace() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.GracePeriodTooShort.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            INACTIVITY, 59, _defaultVetoMembers(), VETO_THRESHOLD
        );
    }

    function test_RegisterRevertsOnZeroVetoMembers() public {
        address[] memory empty = new address[](0);
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.NoVetoMembers.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            INACTIVITY, GRACE, empty, VETO_THRESHOLD
        );
    }

    function test_RegisterRevertsOnTooManyVetoMembers() public {
        address[] memory tooMany = new address[](9);
        for (uint256 i = 0; i < 9; i++) {
            tooMany[i] = address(uint160(i + 1));
        }
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.TooManyVetoMembers.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            INACTIVITY, GRACE, tooMany, 1
        );
    }

    function test_RegisterRevertsOnBadVetoThreshold() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.InvalidVetoThreshold.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            INACTIVITY, GRACE, _defaultVetoMembers(), 3 // > 2 members
        );
    }

    function test_RegisterRevertsOnZeroAddressVetoMember() public {
        address[] memory members = new address[](1);
        members[0] = address(0);
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.ZeroAddressVeto.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            INACTIVITY, GRACE, members, 1
        );
    }

    function test_RegisterRevertsOnDuplicateVetoMember() public {
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = alice;
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.DuplicateVetoMember.selector);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0,
            INACTIVITY, GRACE, members, 1
        );
    }

    /// The headline behavior change: a will's committee only covers that will.
    function test_VetoCommitteeIsScopedPerWill() public {
        _registerFixtureWill(); // committee is [alice, bob]
        assertTrue(registry.isVetoMemberOf(fxCommitment, alice), "alice is on fixture will's committee");
        assertFalse(registry.isVetoMemberOf(fxCommitment, anyone), "anyone is not");

        address[] memory otherMembers = new address[](1);
        otherMembers[0] = anyone;
        vm.startPrank(owner);
        usdc.approve(address(registry), TOTAL_USDC);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT, MERKLE_ROOT, TOTAL_ETH, TOTAL_USDC, 0,
            INACTIVITY, GRACE, otherMembers, 1
        );
        vm.stopPrank();

        assertTrue(registry.isVetoMemberOf(COMMITMENT, anyone), "anyone is on the second will's committee");
        assertFalse(registry.isVetoMemberOf(COMMITMENT, alice), "alice is not on the second will's committee");
    }
```

- [ ] **Step 6: Update `test_VetoBelowThresholdAccumulates`**

Replace it with:

```solidity
    function test_VetoBelowThresholdAccumulates() public {
        // A dedicated registry to observe accumulation under a threshold-2 committee.
        InheritanceRegistry reg2 = new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            address(poseidonT3),
            address(poseidonT5)
        );
        address[] memory m = new address[](2);
        m[0] = alice;
        m[1] = bob;

        vm.startPrank(owner);
        usdc.approve(address(reg2), fxUsdc);
        reg2.register{value: fxEth}(fxCommitment, fxRoot, fxEth, fxUsdc, 0, INACTIVITY, GRACE, m, 2);
        vm.stopPrank();

        vm.warp(block.timestamp + INACTIVITY + 1);
        reg2.triggerGracePeriod(fxCommitment);

        vm.prank(alice);
        reg2.veto(fxCommitment);
        InheritanceRegistry.Will memory w = reg2.getWill(fxCommitment);
        assertTrue(w.graceStart != 0, "grace still open after 1 of 2");
        assertEq(w.vetoCount, 1, "one veto");

        // alice cannot veto twice in the same epoch
        vm.prank(alice);
        vm.expectRevert(InheritanceRegistry.AlreadyVetoed.selector);
        reg2.veto(fxCommitment);

        // bob's veto reaches the threshold and cancels grace
        vm.prank(bob);
        reg2.veto(fxCommitment);
        w = reg2.getWill(fxCommitment);
        assertEq(w.graceStart, 0, "grace cancelled at threshold");
    }
```

(`self.setVerified(owner, true)` from `setUp()` already covers `reg2` too — `MockSelfVerifier` verification is per-address, not per-registry.)

- [ ] **Step 7: Update `test_ClaimReentrancyIsBlocked`**

Replace it with:

```solidity
    function test_ClaimReentrancyIsBlocked() public {
        MockWillVerifier mockVerifier = new MockWillVerifier();
        InheritanceRegistry reg = new InheritanceRegistry(
            address(mockVerifier),
            address(self),
            address(usdc),
            address(poseidonT3),
            address(poseidonT5)
        );
        address[] memory members = new address[](1);
        members[0] = alice;

        ReentrantBeneficiary attacker = new ReentrantBeneficiary();

        // Single-beneficiary tree: slot 0 = attacker, 4 wei + 400 usdc.
        bytes32 leafA = _leaf(uint256(uint160(address(attacker))), 4, 400);
        bytes32[8] memory bh;
        bh[0] = leafA; // bh[1..7] = 0
        bytes32[4] memory l1;
        for (uint256 i = 0; i < 4; i++) l1[i] = _h2(bh[2 * i], bh[2 * i + 1]);
        bytes32 rootL2a = _h2(l1[0], l1[1]);
        bytes32 rootL2b = _h2(l1[2], l1[3]);
        uint256 root = uint256(_h2(rootL2a, rootL2b));
        bytes32[3] memory siblings = [bytes32(0), l1[1], rootL2b];

        bytes32 commitment = bytes32(uint256(0xDEAD));

        // register (owner deposits the escrow) + execute (mock verifier -> true)
        vm.startPrank(owner);
        usdc.approve(address(reg), 400);
        reg.register{value: 4}(commitment, root, 4, 400, 0, INACTIVITY, GRACE, members, 1);
        vm.stopPrank();
        vm.warp(block.timestamp + INACTIVITY + 1);
        reg.triggerGracePeriod(commitment);
        vm.warp(block.timestamp + GRACE + 1);
        reg.executeWill(commitment, "");

        // attacker claims; its receive() re-enters and is blocked.
        attacker.configure(reg, commitment, 4, 400, 0, siblings);
        attacker.attack();

        assertTrue(attacker.reentered(), "reentrancy was attempted");
        assertEq(address(attacker).balance, 4, "attacker got exactly one ETH share");
        assertEq(usdc.balanceOf(address(attacker)), 400, "attacker got one USDC share");
        assertEq(address(reg).balance, 0, "escrow drained once");
        assertEq(usdc.balanceOf(address(reg)), 0, "usdc drained once");

        // a further top-level claim is rejected outright
        vm.expectRevert(InheritanceRegistry.AlreadyClaimed.selector);
        attacker.attack();
    }
```

- [ ] **Step 8: Run the full suite**

Run: `cd contracts && forge test`
Expected: all tests pass (the original 33, minus the 1 deleted constructor test, plus the 8 new ones added in Steps 5 and this task overall = 40 tests, all green).

- [ ] **Step 9: Commit**

```bash
cd contracts
git add test/InheritanceRegistry.t.sol
git commit -m "test(contracts): rewrite InheritanceRegistry tests for per-will config"
```

---

### Task 3: Deploy scripts — drop timing/veto args

**Files:**
- Modify: `contracts/script/Deploy.s.sol`
- Modify: `contracts/script/DeployTestnet.s.sol`
- Modify: `contracts/script/DeployLocalE2E.s.sol`

**Interfaces:**
- Consumes: Task 1's 5-arg `InheritanceRegistry` constructor.

- [ ] **Step 1: Simplify `Deploy.s.sol`**

Replace the whole file with:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {PoseidonDeployer} from "../src/PoseidonDeployer.sol";

/// @title Deploy the ZK-AfterLife V1 stack
/// @notice Deploys HonkVerifier -> WillVerifier -> Poseidon(T3,T5) ->
///         InheritanceRegistry. Inactivity/grace/veto committee are chosen
///         per-will at register() time, not at deploy time.
/// @dev External deps are deployed separately and passed by address:
///        SELF_VERIFIER  - SelfHumanVerifier (see DeploySelfHumanVerifier.s.sol)
///        USDC_TOKEN     - the ERC20 escrowed alongside ETH
///      Run: forge script script/Deploy.s.sol --rpc-url <RPC> --broadcast
contract DeployScript is Script {
    struct Config {
        uint256 pk;
        address deployer;
        address selfVerifier;
        address usdc;
    }

    function run() external {
        Config memory c = _config();

        bytes memory t3code = vm.parseBytes(vm.readFile("poseidon/PoseidonT3.bin"));
        bytes memory t5code = vm.parseBytes(vm.readFile("poseidon/PoseidonT5.bin"));

        vm.startBroadcast(c.pk);

        WillVerifier willVerifier = new WillVerifier(address(new HonkVerifier()));
        address poseidonT3 = PoseidonDeployer.deploy(t3code);
        address poseidonT5 = PoseidonDeployer.deploy(t5code);

        InheritanceRegistry registry = new InheritanceRegistry(
            address(willVerifier),
            c.selfVerifier,
            c.usdc,
            poseidonT3,
            poseidonT5
        );

        vm.stopBroadcast();

        console.log("=== ZK-AfterLife V1 deployment ===");
        console.log("Deployer:           ", c.deployer);
        console.log("WillVerifier:       ", address(willVerifier));
        console.log("PoseidonT3:         ", poseidonT3);
        console.log("PoseidonT5:         ", poseidonT5);
        console.log("InheritanceRegistry:", address(registry));
        console.log("selfVerifier (ext): ", c.selfVerifier);
        console.log("usdc (ext):         ", c.usdc);
    }

    function _config() internal view returns (Config memory c) {
        c.pk = vm.envUint("PRIVATE_KEY");
        c.deployer = vm.addr(c.pk);
        c.selfVerifier = vm.envAddress("SELF_VERIFIER");
        c.usdc = vm.envAddress("USDC_TOKEN");
    }
}
```

- [ ] **Step 2: Simplify `DeployTestnet.s.sol`**

Replace the whole file with:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {PoseidonDeployer} from "../src/PoseidonDeployer.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {MockSelfVerifier} from "../test/mocks/MockSelfVerifier.sol";

/// @title Deploy the V1 stack to a public EVM testnet (Sepolia, Base Sepolia,
///        zkSync Era Sepolia, ...).
/// @dev MockUSDC + MockSelfVerifier stand in for the real ERC20 / Self Protocol
///      hub: Self's real IdentityVerificationHub only exists on Celo/Celo
///      Sepolia, and InheritanceRegistry.register() calls selfVerifier as a
///      same-chain call, so real Self-gating can't work on these chains
///      without cross-chain messaging (out of scope here). MockSelfVerifier's
///      setVerified is intentionally permissionless — the frontend exposes a
///      "Skip verification (testnet mock)" button so any real visitor can
///      still complete a real will end to end. Every other contract
///      (HonkVerifier, WillVerifier, Poseidon, InheritanceRegistry, the will
///      circuit) is the genuine production system. Inactivity/grace/veto
///      committee are chosen per-will at register() time, not deploy time.
///      Run: forge script script/DeployTestnet.s.sol --rpc-url <RPC> --broadcast --private-key <pk> [--verify --etherscan-api-key <KEY>]
contract DeployTestnetScript is Script {
    struct Config {
        uint256 pk;
        address deployer;
    }

    struct Deployed {
        address registry;
        address usdc;
        address self;
        address willVerifier;
        address poseidonT3;
        address poseidonT5;
    }

    function run() external {
        Config memory c = _config();
        Deployed memory d = _deploy(c);
        _logResult(c, d);
    }

    function _deploy(Config memory c) internal returns (Deployed memory d) {
        bytes memory t3code = vm.parseBytes(vm.readFile("poseidon/PoseidonT3.bin"));
        bytes memory t5code = vm.parseBytes(vm.readFile("poseidon/PoseidonT5.bin"));

        vm.startBroadcast(c.pk);

        d.usdc = address(new MockUSDC());
        d.self = address(new MockSelfVerifier());
        d.willVerifier = address(new WillVerifier(address(new HonkVerifier())));
        d.poseidonT3 = PoseidonDeployer.deploy(t3code);
        d.poseidonT5 = PoseidonDeployer.deploy(t5code);

        d.registry = address(
            new InheritanceRegistry(d.willVerifier, d.self, d.usdc, d.poseidonT3, d.poseidonT5)
        );

        vm.stopBroadcast();
    }

    function _logResult(Config memory c, Deployed memory d) internal view {
        console.log("=== ZK-AfterLife testnet deployment ===");
        console.log("Deployer:           ", c.deployer);
        console.log("WillVerifier:       ", d.willVerifier);
        console.log("PoseidonT3:         ", d.poseidonT3);
        console.log("PoseidonT5:         ", d.poseidonT5);
        console.log("REGISTRY_ADDR=%s", d.registry);
        console.log("USDC_ADDR=%s", d.usdc);
        console.log("SELF_VERIFIER_ADDR=%s", d.self);
        console.log("DEPLOY_BLOCK=%s", block.number);
    }

    function _config() internal view returns (Config memory c) {
        c.pk = vm.envUint("PRIVATE_KEY");
        c.deployer = vm.addr(c.pk);
    }
}
```

- [ ] **Step 3: Simplify `DeployLocalE2E.s.sol`**

Replace the whole file with:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {PoseidonDeployer} from "../src/PoseidonDeployer.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {MockSelfVerifier} from "../test/mocks/MockSelfVerifier.sol";

/// @title Deploy the full V1 stack to a local Anvil devnet for the in-browser
///        E2E harness (register -> prove -> verify -> claim).
/// @dev Test-only: stands in MockUSDC + MockSelfVerifier for the real ERC20 /
///      Self Protocol hub, which cannot be exercised on a local chain. Every
///      other contract (HonkVerifier, WillVerifier, Poseidon, InheritanceRegistry)
///      is the genuine production contract. Inactivity/grace/veto committee
///      are chosen per-will at register() time, supplied by the E2E harness.
///      Run: forge script script/DeployLocalE2E.s.sol --rpc-url http://localhost:8545 --broadcast --private-key <pk>
contract DeployLocalE2EScript is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address owner = vm.envOr("E2E_OWNER", deployer);

        bytes memory t3code = vm.parseBytes(vm.readFile("poseidon/PoseidonT3.bin"));
        bytes memory t5code = vm.parseBytes(vm.readFile("poseidon/PoseidonT5.bin"));

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC();
        MockSelfVerifier self = new MockSelfVerifier();
        WillVerifier willVerifier = new WillVerifier(address(new HonkVerifier()));
        address poseidonT3 = PoseidonDeployer.deploy(t3code);
        address poseidonT5 = PoseidonDeployer.deploy(t5code);

        InheritanceRegistry registry = new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            poseidonT3,
            poseidonT5
        );

        self.setVerified(owner, true);
        usdc.mint(owner, 1_000_000e6);

        vm.stopBroadcast();

        console.log("=== ZK-AfterLife local E2E deployment ===");
        console.log("REGISTRY_ADDR=%s", address(registry));
        console.log("USDC_ADDR=%s", address(usdc));
        console.log("SELF_VERIFIER_ADDR=%s", address(self));
        console.log("WILL_VERIFIER_ADDR=%s", address(willVerifier));
        console.log("POSEIDON_T3_ADDR=%s", poseidonT3);
        console.log("POSEIDON_T5_ADDR=%s", poseidonT5);
    }
}
```

- [ ] **Step 4: Remove the now-dead env vars from `.env.example`**

`contracts/.env.example` currently documents `INACTIVITY_PERIOD`/`GRACE_PERIOD`/`VETO_THRESHOLD`/`VETO_MEMBER_2` as optional deploy-time overrides. After this task, `DeployTestnet.s.sol` no longer reads any of them — leaving them in the template would mislead. Replace the tail of the file (from `# Optional overrides...` through `VETO_MEMBER_2=0x...`) so the file ends after the `BASESCAN_API_KEY=` line, with no trailing "Optional overrides" section.

If `contracts/.env` already exists locally (the user copied it from this template earlier), delete the same 4 lines from it too — they're dead config now, not secrets, so this is safe to just tell the user rather than script.

- [ ] **Step 5: Build**

Run: `cd contracts && forge build`
Expected: `Compiler run successful!`

- [ ] **Step 6: Commit**

```bash
cd contracts
git add script/Deploy.s.sol script/DeployTestnet.s.sol script/DeployLocalE2E.s.sol .env.example
git commit -m "chore(contracts): drop deploy-time timing/veto args, now per-will"
```

---

### Task 4: Frontend contract layer — ABI + registryService + WalletContext

**Files:**
- Modify: `frontend/src/config/abi/inheritanceRegistry.ts`
- Modify: `frontend/src/services/registryService.ts`
- Modify: `frontend/src/lib/WalletContext.tsx`

**Interfaces:**
- Consumes: Task 1's `register()` signature, `Will` struct shape, `isVetoMemberOf`.
- Produces: `WillRecord` gains `inactivityPeriod: bigint`, `gracePeriod: bigint`, `vetoThreshold: number`, `vetoMembers: Address[]`. `registryService.register(commitment, merkleRoot, totalEthWei, totalUsdcBaseUnits, inactivityPeriod, gracePeriod, vetoMembers, vetoThreshold)`. `registryService.isVetoMemberOf(commitment, who): Promise<boolean>`. `WalletContext`'s `register` and `isVetoMemberOf` match the same shapes; `getGraceConfig`, `getVetoMembers`, `isVetoMember` are removed from both.

- [ ] **Step 1: Update the ABI**

Replace `frontend/src/config/abi/inheritanceRegistry.ts` with:

```typescript
import { parseAbi } from "viem";

// Verbatim from contracts/src/InheritanceRegistry.sol. Frozen interface —
// keep in lockstep with the deployed contract (see docs/superpowers/specs/
// 2026-08-09-inheritance-registry-design.md and 2026-08-12-per-will-config-design.md).
export const INHERITANCE_REGISTRY_ABI = parseAbi([
  "function register(bytes32 willCommitment, uint256 merkleRoot, uint256 totalEth, uint256 totalUsdc, uint256 totalNftCount, uint256 inactivityPeriod, uint256 gracePeriod, address[] vetoMembers, uint256 vetoThreshold) payable",
  "function checkIn(bytes32 willCommitment)",
  "function triggerGracePeriod(bytes32 willCommitment)",
  "function veto(bytes32 willCommitment)",
  "function executeWill(bytes32 willCommitment, bytes proof)",
  "function claim(bytes32 willCommitment, uint256 ethAmount, uint256 usdcAmount, uint256 leafIndex, bytes32[3] siblings)",
  "function getWill(bytes32 willCommitment) view returns ((address owner, uint256 merkleRoot, uint256 totalEth, uint256 totalUsdc, uint64 registeredAt, uint64 lastCheckIn, uint64 graceStart, uint32 graceEpoch, uint32 vetoCount, bool executed, bool exists, uint64 inactivityPeriod, uint64 gracePeriod, uint8 vetoThreshold, address[] vetoMembers))",
  "function isVetoMemberOf(bytes32 willCommitment, address who) view returns (bool)",
  "event WillRegistered(bytes32 indexed willCommitment, address indexed owner, uint256 totalEth, uint256 totalUsdc)",
  "error NotVerifiedHuman()",
  "error WillAlreadyRegistered()",
  "error InvalidMerkleRoot()",
  "error NftsNotSupported()",
  "error EmptyWill()",
  "error EthDepositMismatch()",
  "error InactivityPeriodTooShort()",
  "error GracePeriodTooShort()",
  "error NoVetoMembers()",
  "error TooManyVetoMembers()",
  "error InvalidVetoThreshold()",
  "error ZeroAddressVeto()",
  "error DuplicateVetoMember()",
  "error WillNotRegistered()",
  "error WillAlreadyExecuted()",
  "error NotWillOwner()",
  "error StillActive()",
  "error GraceAlreadyActive()",
  "error GraceNotStarted()",
  "error GraceNotElapsed()",
  "error GracePeriodOver()",
  "error NotVetoMember()",
  "error AlreadyVetoed()",
  "error InvalidProof()",
  "error NotExecuted()",
  "error AlreadyClaimed()",
  "error NothingToClaim()",
  "error InvalidLeafIndex()",
  "error InvalidMerkleProof()",
  "error TransferFailed()",
]);
```

- [ ] **Step 2: Update `registryService.ts`**

In `WillRecord`, add the 4 new fields (after `exists: boolean;`):

```typescript
export interface WillRecord {
  owner: Address;
  merkleRoot: bigint;
  totalEth: bigint;
  totalUsdc: bigint;
  registeredAt: bigint;
  lastCheckIn: bigint;
  graceStart: bigint;
  graceEpoch: number;
  vetoCount: number;
  executed: boolean;
  exists: boolean;
  inactivityPeriod: bigint;
  gracePeriod: bigint;
  vetoThreshold: number;
  vetoMembers: Address[];
}
```

Delete the `GraceConfig` interface entirely.

Update `toWillRecord`:

```typescript
function toWillRecord(raw: any): WillRecord {
  return {
    owner: raw.owner,
    merkleRoot: raw.merkleRoot,
    totalEth: raw.totalEth,
    totalUsdc: raw.totalUsdc,
    registeredAt: raw.registeredAt,
    lastCheckIn: raw.lastCheckIn,
    graceStart: raw.graceStart,
    graceEpoch: Number(raw.graceEpoch),
    vetoCount: Number(raw.vetoCount),
    executed: raw.executed,
    exists: raw.exists,
    inactivityPeriod: raw.inactivityPeriod,
    gracePeriod: raw.gracePeriod,
    vetoThreshold: Number(raw.vetoThreshold),
    vetoMembers: raw.vetoMembers,
  };
}
```

Delete the `isVetoMember(address)` and `getVetoMembers()` methods and the `getGraceConfig()` method entirely. Add, in their place (same spot, after `isSelfVerified`):

```typescript
  async isVetoMemberOf(commitment: Hex, who: Address): Promise<boolean> {
    return (await this.publicClient.readContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "isVetoMemberOf",
      args: [commitment, who],
    })) as boolean;
  }
```

Replace `register()`:

```typescript
  async register(
    commitment: Hex,
    merkleRoot: bigint,
    totalEthWei: bigint,
    totalUsdcBaseUnits: bigint,
    inactivityPeriod: bigint,
    gracePeriod: bigint,
    vetoMembers: Address[],
    vetoThreshold: bigint
  ): Promise<Hex> {
    if (!this.walletClient) throw new Error("Wallet not connected");

    if (totalUsdcBaseUnits > 0n) {
      const approveHash = await this.walletClient.writeContract({
        address: this.usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [this.registryAddress, totalUsdcBaseUnits],
        account: this.walletClient.account,
        chain: this.walletClient.chain,
      });
      await this.waitForTransaction(approveHash);
    }

    return (await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: INHERITANCE_REGISTRY_ABI,
      functionName: "register",
      args: [
        commitment,
        merkleRoot,
        totalEthWei,
        totalUsdcBaseUnits,
        0n,
        inactivityPeriod,
        gracePeriod,
        vetoMembers,
        vetoThreshold,
      ],
      value: totalEthWei,
      account: this.walletClient.account,
      chain: this.walletClient.chain,
    })) as Hex;
  }
```

- [ ] **Step 3: Update `WalletContext.tsx`**

Change the import line to drop `GraceConfig`:

```typescript
import { registryService, type WillRecord, type MyWill } from '@/services/registryService';
```

In `WalletContextType`, replace:

```typescript
  isVetoMember: (address: Address) => Promise<boolean>;
  getVetoMembers: () => Promise<Address[]>;
  getGraceConfig: () => Promise<GraceConfig>;
```

with:

```typescript
  isVetoMemberOf: (commitment: Hex, who: Address) => Promise<boolean>;
```

Change `register`'s type signature to:

```typescript
  register: (
    commitment: Hex,
    merkleRoot: bigint,
    totalEthWei: bigint,
    totalUsdcBaseUnits: bigint,
    inactivityPeriod: bigint,
    gracePeriod: bigint,
    vetoMembers: Address[],
    vetoThreshold: bigint
  ) => Promise<Hex>;
```

Replace the `isVetoMember`/`getVetoMembers`/`getGraceConfig` const declarations with:

```typescript
  const isVetoMemberOf = async (commitment: Hex, who: Address) =>
    registryService.isVetoMemberOf(commitment, who);
```

Replace the `register` implementation:

```typescript
  const register = async (
    commitment: Hex,
    merkleRoot: bigint,
    totalEthWei: bigint,
    totalUsdcBaseUnits: bigint,
    inactivityPeriod: bigint,
    gracePeriod: bigint,
    vetoMembers: Address[],
    vetoThreshold: bigint
  ): Promise<Hex> => {
    if (!isConnected) throw new Error('Wallet not connected');
    setIsLoading(true);
    setError(null);
    try {
      const hash = await registryService.register(
        commitment,
        merkleRoot,
        totalEthWei,
        totalUsdcBaseUnits,
        inactivityPeriod,
        gracePeriod,
        vetoMembers,
        vetoThreshold
      );
      await registryService.waitForTransaction(hash);
      return hash;
    } catch (err) {
      console.error('Failed to register will:', err);
      setError(err instanceof Error ? err.message : 'Failed to register will. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
```

In the `value` object, replace `isVetoMember, getVetoMembers, getGraceConfig,` with `isVetoMemberOf,`.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: errors in `register/page.tsx`, `checkin/page.tsx`, `execute/page.tsx`, `veto/page.tsx` (they still call the old signatures/methods) — that's expected; Tasks 5 and 6 fix them. Confirm the errors are ONLY in those 4 files, not in `registryService.ts`/`WalletContext.tsx`/the ABI file themselves.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/config/abi/inheritanceRegistry.ts src/services/registryService.ts src/lib/WalletContext.tsx
git commit -m "feat(frontend): thread per-will config through registryService/WalletContext"
```

---

### Task 5: register/page.tsx — new "Trusted circle" wizard step

**Files:**
- Modify: `frontend/src/app/register/page.tsx`

**Interfaces:**
- Consumes: Task 4's `register(commitment, merkleRoot, totalEthWei, totalUsdcBaseUnits, inactivityPeriod, gracePeriod, vetoMembers, vetoThreshold)`.
- Produces: A new wizard step (index 3, "Trusted circle") between Beneficiaries (2) and Review (now 4); Success screen moves to index 5. Field labels the E2E harness (Task 7) will target by exact string: `"Inactivity period (days)"`, `"Grace period (days)"`, `"Member 01"` (and `"Member 02"`, etc.), `"Veto threshold"`.

- [ ] **Step 1: Extend `WillData` and its default state**

Replace the `WillData` interface and `STEP_LABELS`:

```typescript
interface WillData {
  beneficiaries: Beneficiary[];
  description: string;
  willSalt: string;
  inactivityDays: string;
  graceDays: string;
  vetoMembers: string[];
  vetoThreshold: string;
}

const STEP_LABELS = ["Verify", "Details", "Beneficiaries", "Trusted circle", "Review"];
const USDC_DECIMALS = 6;
// Mirrors InheritanceRegistry's MIN_INACTIVITY_PERIOD / MIN_GRACE_PERIOD (seconds)
// and MAX_VETO_MEMBERS — client-side validation only; the contract enforces
// the real floor/cap regardless.
const MIN_PERIOD_SECONDS = 60;
const MAX_VETO_MEMBERS = 8;
```

Update the `useState<WillData>` initializer:

```typescript
  const [willData, setWillData] = useState<WillData>({
    beneficiaries: [{ address: "", ethAmount: "", usdcAmount: "", name: "" }],
    description: "",
    willSalt: Math.random().toString(36).substring(2, 15),
    inactivityDays: "365",
    graceDays: "30",
    vetoMembers: [""],
    vetoThreshold: "1",
  });
```

- [ ] **Step 2: Add veto-member list handlers and a validation helper**

Add these right after `updateBeneficiary` (before `validateForm`):

```typescript
  const addVetoMember = () => {
    if (willData.vetoMembers.length < MAX_VETO_MEMBERS) {
      setWillData((prev) => ({ ...prev, vetoMembers: [...prev.vetoMembers, ""] }));
    }
  };

  const removeVetoMember = (index: number) => {
    if (willData.vetoMembers.length > 1) {
      setWillData((prev) => ({
        ...prev,
        vetoMembers: prev.vetoMembers.filter((_, i) => i !== index),
      }));
    }
  };

  const updateVetoMember = (index: number, value: string) => {
    setWillData((prev) => ({
      ...prev,
      vetoMembers: prev.vetoMembers.map((m, i) => (i === index ? value : m)),
    }));
  };

  const vetoValidationError = (): string | null => {
    const members = willData.vetoMembers.map((m) => m.trim()).filter(Boolean);
    if (members.length === 0) return "Add at least one trusted circle member";
    if (members.some((m) => !/^0x[0-9a-fA-F]{40}$/.test(m))) {
      return "Every trusted circle member needs a valid address";
    }
    const threshold = parseInt(willData.vetoThreshold || "0", 10);
    if (!threshold || threshold < 1 || threshold > members.length) {
      return "Veto threshold must be between 1 and the number of trusted circle members";
    }
    const inactivitySeconds = parseFloat(willData.inactivityDays || "0") * 86400;
    const graceSeconds = parseFloat(willData.graceDays || "0") * 86400;
    if (inactivitySeconds < MIN_PERIOD_SECONDS) return "Inactivity period is too short";
    if (graceSeconds < MIN_PERIOD_SECONDS) return "Grace period is too short";
    return null;
  };
```

- [ ] **Step 3: Update `handleSubmit` to convert and pass the new fields**

Replace the tail of `handleSubmit` (from `await register(...)` in the original, through `setStep(4)`) with:

```typescript
      const inactivityPeriodSeconds = BigInt(
        Math.round(parseFloat(willData.inactivityDays || "0") * 86400)
      );
      const gracePeriodSeconds = BigInt(Math.round(parseFloat(willData.graceDays || "0") * 86400));
      const vetoMembersAddrs = willData.vetoMembers.map((m) => m.trim()).filter(Boolean) as Hex[];
      const vetoThresholdBigInt = BigInt(parseInt(willData.vetoThreshold || "1", 10));

      await register(
        willCommitment as Hex,
        merkleRootBigInt,
        totalEthWei,
        totalUsdcBaseUnits,
        inactivityPeriodSeconds,
        gracePeriodSeconds,
        vetoMembersAddrs,
        vetoThresholdBigInt
      );

      setSealedCommitment(willCommitment);
      setStep(5);
```

- [ ] **Step 4: Insert the new "Trusted circle" step (step 3) and renumber Review/Success**

Change the stepper visibility condition from `{step < 4 ? (` to `{step < 5 ? (`.

Insert this new block immediately after the Step 2 (Beneficiaries) block closes (i.e., right before `{/* Step 3 — Review */}`), and rename that comment/condition:

```tsx
      {/* Step 3 — Trusted circle */}
      {step === 3 ? (
        <div className="space-y-6">
          <VaultCard eyebrow="Safety settings">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Inactivity period (days)"
                mono
                type="number"
                placeholder="365"
                value={willData.inactivityDays}
                onChange={(e) => setWillData((prev) => ({ ...prev, inactivityDays: e.target.value }))}
              />
              <Field
                label="Grace period (days)"
                mono
                type="number"
                placeholder="30"
                value={willData.graceDays}
                onChange={(e) => setWillData((prev) => ({ ...prev, graceDays: e.target.value }))}
              />
            </div>
            <p className="t-caption mt-4 max-w-[520px]">
              If you miss check-ins for this long, anyone can open a grace
              window. Your trusted circle can veto during grace before
              anything executes.
            </p>
          </VaultCard>

          <VaultCard eyebrow="Trusted circle">
            {willData.vetoMembers.map((member, index) => (
              <div key={index} className="mb-4 flex items-end gap-3 last:mb-0">
                <div className="flex-1">
                  <Field
                    label={`Member ${String(index + 1).padStart(2, "0")}`}
                    mono
                    placeholder="0x..."
                    value={member}
                    onChange={(e) => updateVetoMember(index, e.target.value)}
                  />
                </div>
                {willData.vetoMembers.length > 1 ? (
                  <button
                    onClick={() => removeVetoMember(index)}
                    className="mb-2.5 text-ink-faint transition-colors hover:text-danger"
                    aria-label="Remove trusted member"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            ))}
            {willData.vetoMembers.length < MAX_VETO_MEMBERS ? (
              <Button variant="secondary" onClick={addVetoMember} className="mt-2 w-full">
                <Plus size={16} /> Add trusted member
              </Button>
            ) : null}
            <div className="mt-5">
              <Field
                label="Veto threshold"
                mono
                type="number"
                placeholder="1"
                value={willData.vetoThreshold}
                onChange={(e) => setWillData((prev) => ({ ...prev, vetoThreshold: e.target.value }))}
              />
              <p className="t-caption mt-1.5">
                How many of your trusted circle must veto to cancel a false alarm.
              </p>
            </div>
          </VaultCard>

          {vetoValidationError() ? (
            <p className="t-caption text-danger">{vetoValidationError()}</p>
          ) : null}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => setStep(4)} disabled={!!vetoValidationError()}>
              Next <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 4 — Review */}
      {step === 4 ? (
```

Change the Review block's closing tag condition (it currently reads `{step === 3 ? (` — that's now been changed to `{step === 4 ? (` in the snippet above) and update its internal "Back" button from `onClick={() => setStep(2)}` to `onClick={() => setStep(3)}`.

Add a settings summary to the Review step — insert this VaultCard right after the existing `<VaultCard eyebrow="Review">...</VaultCard>` block, before `<VaultCard eyebrow="Beneficiaries">`:

```tsx
          <VaultCard eyebrow="Safety settings">
            <DataRow label="Inactivity period" value={`${willData.inactivityDays || "0"} days`} />
            <DataRow label="Grace period" value={`${willData.graceDays || "0"} days`} />
            <DataRow
              label="Trusted circle"
              value={`${willData.vetoMembers.filter((m) => m.trim()).length} members, threshold ${willData.vetoThreshold}`}
            />
          </VaultCard>
```

Change the Success step's condition from `{step === 4 ? (` to `{step === 5 ? (`.

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `register/page.tsx`. (Other pages still have errors from Task 4 until Task 6 fixes them — that's expected at this point.)

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/app/register/page.tsx
git commit -m "feat(frontend): add trusted-circle + timing step to the register wizard"
```

---

### Task 6: checkin/execute/veto pages — read per-will config

**Files:**
- Modify: `frontend/src/app/checkin/page.tsx`
- Modify: `frontend/src/app/execute/page.tsx`
- Modify: `frontend/src/app/veto/page.tsx`

**Interfaces:**
- Consumes: Task 4's `WillRecord.inactivityPeriod`/`.gracePeriod`, `isVetoMemberOf(commitment, who)`.

- [ ] **Step 1: `checkin/page.tsx` — read `myWill.will.inactivityPeriod` instead of `getGraceConfig()`**

Change the destructured `useWallet()` call (drop `getGraceConfig`):

```typescript
  const { isConnected, account, getMyWill, checkIn, connectWallet, isLoading, error } =
    useWallet();
```

In `loadStatus`, replace:

```typescript
      const { inactivityPeriod } = await getGraceConfig();
```

with:

```typescript
      const inactivityPeriod = my.will.inactivityPeriod;
```

- [ ] **Step 2: `execute/page.tsx` — make `isGraceElapsed` exact**

Replace `isGraceElapsed`:

```typescript
  const isGraceElapsed = (w: MyWill) => {
    if (w.will.graceStart === 0n) return false;
    return now() > w.will.graceStart + w.will.gracePeriod;
  };
```

(No other changes needed in this file — the "In grace" / "Ready" filter logic already calls `isGraceElapsed`, which is now accurate instead of an approximation.)

- [ ] **Step 3: `veto/page.tsx` — per-will membership instead of a global flag**

Change the destructured `useWallet()` call:

```typescript
  const { isConnected, account, getAllWills, isVetoMemberOf, veto, connectWallet, isLoading, error } =
    useWallet();
```

Remove the `amIVetoMember` state declaration (`const [amIVetoMember, setAmIVetoMember] = useState(false);`).

Replace `loadVetoData`:

```typescript
  const loadVetoData = async () => {
    try {
      const all = await getAllWills();
      const inGrace = all.filter((w) => w.will.graceStart !== 0n && !w.will.executed);
      const membership = await Promise.all(
        inGrace.map((w) => isVetoMemberOf(w.commitment, account!))
      );
      setVetoableWills(inGrace.filter((_, i) => membership[i]));
    } catch (err) {
      console.error("Failed to load veto data:", err);
      setLocalError("Failed to load veto data. Please try again.");
    }
  };
```

Remove the entire "not a committee member" notice block:

```tsx
      {!amIVetoMember ? (
        <VaultCard className="mb-8">
          <p className="t-body text-ink-muted">
            Your connected address isn&apos;t part of the veto committee. You
            can see wills currently in grace, but only committee members can
            cast a veto.
          </p>
        </VaultCard>
      ) : null}
```

In the wills list, remove the `{amIVetoMember ? ... : null}` conditional around the "Veto execution" button — every will in `vetoableWills` is now, by construction, one the connected account can veto:

```tsx
                <div className="mt-6 border-t border-hairline pt-5">
                  <Button
                    variant="destructive"
                    disabled={isProcessing}
                    onClick={() => {
                      setSelectedWill(will);
                      setShowVetoModal(true);
                    }}
                  >
                    Veto execution
                  </Button>
                </div>
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

- [ ] **Step 5: Production build**

Run: `cd frontend && npm run build`
Expected: all 15 pages build (same pre-existing `web-worker`/circomlibjs warning as before, no new errors).

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/app/checkin/page.tsx src/app/execute/page.tsx src/app/veto/page.tsx
git commit -m "feat(frontend): read per-will timing/veto config on checkin/execute/veto pages"
```

---

### Task 7: E2E harness — per-will config + full run

**Files:**
- Modify: `frontend/e2e/anvil-e2e.js`

**Interfaces:**
- Consumes: Task 5's `"Inactivity period (days)"`, `"Grace period (days)"`, `"Member 01"`, `"Veto threshold"` field labels; Task 1's `MIN_INACTIVITY_PERIOD`/`MIN_GRACE_PERIOD` = 60s.

- [ ] **Step 1: Fill the new wizard step during register, adjust wait times**

Replace the block from `log("Step 2: beneficiary");` through `log("Waiting for inactivity period to elapse (real time)...");` / `await sleep(22000);` with:

```javascript
    log("Step 2: beneficiary");
    await ownerPage.getByLabel("Name").fill("Bob");
    await ownerPage.getByLabel("Address").fill(BENEFICIARY);
    await ownerPage.getByLabel("ETH").fill(ETH_AMOUNT);
    await ownerPage.getByLabel("USDC").fill(USDC_AMOUNT);
    await ownerPage.getByRole("button", { name: "Next" }).click();

    // 0.001 days ≈ 86s — comfortably above the contract's 60s floor
    // (MIN_INACTIVITY_PERIOD/MIN_GRACE_PERIOD) while keeping the harness fast.
    // Real users choose days/months here; this value only exists to make a
    // real-time E2E run practical.
    log("Step 3: trusted circle + timing");
    await ownerPage.getByLabel("Inactivity period (days)").fill("0.001");
    await ownerPage.getByLabel("Grace period (days)").fill("0.001");
    await ownerPage.getByLabel("Member 01").fill(OWNER);
    await ownerPage.getByLabel("Veto threshold").fill("1");
    await ownerPage.getByRole("button", { name: "Next" }).click();

    log("Step 4: review -> seal will (real on-chain register tx)");
    await ownerPage.getByRole("button", { name: "Seal will" }).click();
    await ownerPage.getByText("Your will is sealed.").waitFor({ timeout: 30000 });

    await ownerPage.getByRole("button", { name: "Toggle commitment visibility" }).click();
    const commitment = await ownerPage.locator("code.font-mono.text-\\[13px\\].text-ink").first().innerText();
    const pageText = await ownerPage.locator("main").innerText();
    const saltMatch = pageText.match(/will salt \(([a-z0-9]+)\)/i);
    if (!saltMatch) throw new Error("Could not scrape willSalt from success screen");
    const willSalt = saltMatch[1];

    log(`Registered. commitment=${commitment} willSalt=${willSalt}`);

    // ---- 2. Trigger grace period once inactivity elapses (real wall clock) ----
    log("Waiting for inactivity period to elapse (real time)...");
    await sleep(95000);
```

- [ ] **Step 2: Adjust the grace-elapse wait**

Replace `await sleep(17000);` (in the "Execute once grace elapses" section) with:

```javascript
    await sleep(95000);
```

- [ ] **Step 3: Run the full harness against a fresh local deploy**

```bash
pkill -f anvil 2>/dev/null; sleep 1
anvil --port 8545 > /tmp/anvil-e2e.log 2>&1 &
sleep 2
cd contracts
PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PRIVATE_KEY="$PK" E2E_OWNER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  forge script script/DeployLocalE2E.s.sol --rpc-url http://localhost:8545 --broadcast --private-key "$PK"
```

Update `frontend/.env.local`'s `NEXT_PUBLIC_LOCALHOST_REGISTRY_ADDRESS`/`NEXT_PUBLIC_LOCALHOST_USDC_ADDRESS`/`NEXT_PUBLIC_LOCALHOST_SELF_VERIFIER_ADDRESS` with the freshly printed `REGISTRY_ADDR`/`USDC_ADDR`/`SELF_VERIFIER_ADDR` values, then:

```bash
cd frontend
pkill -f "next dev" 2>/dev/null; sleep 1
rm -rf .next
npm run dev > /tmp/frontend-e2e.log 2>&1 &
# wait for it to answer on :3000, then:
node e2e/anvil-e2e.js
```

Expected: `[e2e] E2E PASSED: register -> prove -> verify -> claim, all real, against local Anvil.`

If the run fails, use `superpowers:systematic-debugging` before touching the harness or the contract again — do not guess at a fix.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add e2e/anvil-e2e.js
git commit -m "test(frontend): update E2E harness for per-will config"
```

---

## Post-plan: Phase 1e deploys resume

Once Task 7's run passes, the Sepolia/Base Sepolia deploys (paused for this plan) can resume with `DeployTestnet.s.sol` — no timing/veto env vars needed anymore; each real user chooses their own via the register wizard.
