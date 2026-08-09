// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockSelfVerifier} from "./mocks/MockSelfVerifier.sol";
import {PoseidonDeployer} from "./mocks/PoseidonDeployer.sol";
import {IPoseidonT3, IPoseidonT5} from "../src/interfaces/IPoseidon.sol";

/**
 * @title InheritanceRegistryTest
 * @notice Lifecycle tests for the single execution contract. Uses the real
 *         HonkVerifier + WillVerifier so the execute path is genuinely verified,
 *         with mock USDC and a toggleable mock Self gate.
 */
contract InheritanceRegistryTest is Test {
    InheritanceRegistry internal registry;
    HonkVerifier internal honk;
    WillVerifier internal willVerifier;
    MockUSDC internal usdc;
    MockSelfVerifier internal self;
    IPoseidonT3 internal poseidonT3;
    IPoseidonT5 internal poseidonT5;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice"); // veto member
    address internal bob = makeAddr("bob"); // veto member
    address internal anyone = makeAddr("anyone");

    uint256 internal constant INACTIVITY = 30;
    uint256 internal constant GRACE = 15;
    uint256 internal constant VETO_THRESHOLD = 1;

    // A well-formed (but not proof-backed) will used for register/lifecycle tests.
    bytes32 internal constant COMMITMENT = bytes32(uint256(0xABCDEF));
    uint256 internal constant MERKLE_ROOT = uint256(0x1234);
    uint256 internal constant TOTAL_ETH = 10 ether;
    uint256 internal constant TOTAL_USDC = 1000e6;

    // Real proof fixture (bb prove, nft=0). Its public inputs are the exact
    // commitment/root/totals a will must be registered with to be executable.
    bytes internal proof;
    bytes32 internal fxCommitment;
    uint256 internal fxRoot;
    uint256 internal fxEth; // 10 (wei) — small on purpose; it's the circuit vector
    uint256 internal fxUsdc; // 1000 (base units)

    function setUp() public virtual {
        honk = new HonkVerifier();
        willVerifier = new WillVerifier(address(honk));
        usdc = new MockUSDC();
        self = new MockSelfVerifier();

        poseidonT3 = IPoseidonT3(
            PoseidonDeployer.deploy(vm.parseBytes(vm.readFile("poseidon/PoseidonT3.bin")))
        );
        poseidonT5 = IPoseidonT5(
            PoseidonDeployer.deploy(vm.parseBytes(vm.readFile("poseidon/PoseidonT5.bin")))
        );

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

        self.setVerified(owner, true);
        vm.deal(owner, 100 ether);
        usdc.mint(owner, 1_000_000e6);

        // Load the real nft=0 proof fixture and decode its 5 public inputs.
        proof = vm.readFileBinary("test/fixtures/will_nft0_proof.bin");
        bytes memory pub = vm.readFileBinary("test/fixtures/will_nft0_public_inputs.bin");
        require(pub.length == 160, "expected 5 x 32-byte public inputs");
        uint256[5] memory pi;
        for (uint256 i = 0; i < 5; i++) {
            uint256 v;
            assembly {
                v := mload(add(add(pub, 0x20), mul(i, 0x20)))
            }
            pi[i] = v;
        }
        fxCommitment = bytes32(pi[0]);
        fxRoot = pi[1];
        fxEth = pi[2];
        fxUsdc = pi[3];
        require(pi[4] == 0, "fixture must be nft=0");
    }

    /// Register the fixture-backed will as `owner` (totals match the proof).
    function _registerFixtureWill() internal {
        vm.startPrank(owner);
        usdc.approve(address(registry), fxUsdc);
        registry.register{value: fxEth}(fxCommitment, fxRoot, fxEth, fxUsdc, 0);
        vm.stopPrank();
    }

    /// Drive the fixture will to the point where execute is allowed.
    function _reachExecutable() internal {
        _registerFixtureWill();
        vm.warp(block.timestamp + INACTIVITY + 1);
        registry.triggerGracePeriod(fxCommitment);
        vm.warp(block.timestamp + GRACE + 1);
    }

    /// Register, reach grace end, and execute the fixture will with the real proof.
    function _registerAndExecute() internal {
        _reachExecutable();
        registry.executeWill(fxCommitment, proof);
    }

    // -- On-chain reconstruction of the fixture's Poseidon tree (matches the
    //    circuit's nft=0 beneficiary set: addr 1000/2000/3000). --

    function _leaf(uint256 addr, uint256 eth, uint256 amtUsdc)
        internal
        view
        returns (bytes32)
    {
        return
            poseidonT5.poseidon(
                [bytes32(addr), bytes32(eth), bytes32(amtUsdc), bytes32(0)]
            );
    }

    function _h2(bytes32 a, bytes32 b) internal view returns (bytes32) {
        return poseidonT3.poseidon([a, b]);
    }

    function _buildTree()
        internal
        view
        returns (
            bytes32[8] memory bh,
            bytes32[4] memory l1,
            bytes32[2] memory l2,
            bytes32 root
        )
    {
        bh[0] = _leaf(1000, 4, 400);
        bh[1] = _leaf(2000, 3, 300);
        bh[2] = _leaf(3000, 3, 300);
        // bh[3..7] stay 0 (inactive slots are the literal 0, per the circuit)
        for (uint256 i = 0; i < 4; i++) {
            l1[i] = _h2(bh[2 * i], bh[2 * i + 1]);
        }
        l2[0] = _h2(l1[0], l1[1]);
        l2[1] = _h2(l1[2], l1[3]);
        root = _h2(l2[0], l2[1]);
    }

    /// Register the standard test will as `owner`. Returns nothing; reverts propagate.
    function _register() internal {
        vm.startPrank(owner);
        usdc.approve(address(registry), TOTAL_USDC);
        registry.register{value: TOTAL_ETH}(
            COMMITMENT,
            MERKLE_ROOT,
            TOTAL_ETH,
            TOTAL_USDC,
            0
        );
        vm.stopPrank();
    }

    //////////////// REGISTER ////////////////

    function test_RegisterHappyPath() public {
        _register();

        InheritanceRegistry.Will memory w = registry.getWill(COMMITMENT);
        assertEq(w.owner, owner, "owner");
        assertEq(w.merkleRoot, MERKLE_ROOT, "root");
        assertEq(w.totalEth, TOTAL_ETH, "eth");
        assertEq(w.totalUsdc, TOTAL_USDC, "usdc");
        assertTrue(w.exists, "exists");
        assertFalse(w.executed, "not executed");
        assertEq(w.lastCheckIn, uint64(block.timestamp), "lastCheckIn");

        assertEq(address(registry).balance, TOTAL_ETH, "escrowed ETH");
        assertEq(usdc.balanceOf(address(registry)), TOTAL_USDC, "escrowed USDC");
    }

    function test_RegisterRevertsIfNotVerified() public {
        vm.deal(anyone, 100 ether);
        vm.prank(anyone);
        vm.expectRevert(InheritanceRegistry.NotVerifiedHuman.selector);
        registry.register{value: TOTAL_ETH}(COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0);
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
            0
        );
        vm.stopPrank();
    }

    function test_RegisterRevertsOnNfts() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.NftsNotSupported.selector);
        registry.register{value: TOTAL_ETH}(COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 1);
    }

    function test_RegisterRevertsOnZeroMerkleRoot() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.InvalidMerkleRoot.selector);
        registry.register{value: TOTAL_ETH}(COMMITMENT, 0, TOTAL_ETH, 0, 0);
    }

    function test_RegisterRevertsOnEmptyWill() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceRegistry.EmptyWill.selector);
        registry.register{value: 0}(COMMITMENT, MERKLE_ROOT, 0, 0, 0);
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
            0
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
            0
        );
        vm.stopPrank();
    }

    function test_RegisterEthOnlyWill() public {
        vm.prank(owner);
        registry.register{value: TOTAL_ETH}(COMMITMENT, MERKLE_ROOT, TOTAL_ETH, 0, 0);
        assertEq(address(registry).balance, TOTAL_ETH);
        assertEq(usdc.balanceOf(address(registry)), 0);
    }

    //////////////// CONSTRUCTOR ////////////////

    function test_ConstructorRejectsZeroVerifier() public {
        address[] memory m = new address[](1);
        m[0] = alice;
        vm.expectRevert(InheritanceRegistry.InvalidVerifier.selector);
        new InheritanceRegistry(
            address(0),
            address(self),
            address(usdc),
            address(poseidonT3),
            address(poseidonT5),
            INACTIVITY,
            GRACE,
            m,
            1
        );
    }

    function test_ConstructorRejectsBadVetoThreshold() public {
        address[] memory m = new address[](1);
        m[0] = alice;
        vm.expectRevert(InheritanceRegistry.InvalidVetoThreshold.selector);
        new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            address(poseidonT3),
            address(poseidonT5),
            INACTIVITY,
            GRACE,
            m,
            2 // threshold > members
        );
    }

    //////////////// EXECUTE ////////////////

    function test_ExecuteHappyPath() public {
        _reachExecutable();
        registry.executeWill(fxCommitment, proof);
        assertTrue(registry.getWill(fxCommitment).executed, "executed");
    }

    function test_ExecuteIsPermissionless() public {
        _reachExecutable();
        vm.prank(anyone); // not owner, not veto member
        registry.executeWill(fxCommitment, proof);
        assertTrue(registry.getWill(fxCommitment).executed, "executed by anyone");
    }

    function test_ExecuteRevertsBeforeGrace() public {
        _registerFixtureWill();
        vm.expectRevert(InheritanceRegistry.GraceNotStarted.selector);
        registry.executeWill(fxCommitment, proof);
    }

    function test_ExecuteRevertsDuringGrace() public {
        _registerFixtureWill();
        vm.warp(block.timestamp + INACTIVITY + 1);
        registry.triggerGracePeriod(fxCommitment);
        // still inside the grace window
        vm.expectRevert(InheritanceRegistry.GraceNotElapsed.selector);
        registry.executeWill(fxCommitment, proof);
    }

    function test_ExecuteRevertsOnTamperedProof() public {
        _reachExecutable();
        bytes memory bad = proof;
        bad[64] = bytes1(uint8(bad[64]) ^ 0xFF);
        vm.expectRevert(); // verifier reverts on a corrupted proof
        registry.executeWill(fxCommitment, bad);
    }

    function test_ExecuteRevertsOnWrongStoredTotals() public {
        // Register the fixture commitment/root but with a total that does not
        // match the proof's public inputs; the real proof must not verify.
        vm.startPrank(owner);
        usdc.approve(address(registry), fxUsdc);
        registry.register{value: fxEth + 1}(
            fxCommitment,
            fxRoot,
            fxEth + 1, // wrong total_eth
            fxUsdc,
            0
        );
        vm.stopPrank();
        vm.warp(block.timestamp + INACTIVITY + 1);
        registry.triggerGracePeriod(fxCommitment);
        vm.warp(block.timestamp + GRACE + 1);
        vm.expectRevert(); // public-input mismatch -> verifier reverts
        registry.executeWill(fxCommitment, proof);
    }

    function test_ExecuteRevertsIfAlreadyExecuted() public {
        _reachExecutable();
        registry.executeWill(fxCommitment, proof);
        vm.expectRevert(InheritanceRegistry.WillAlreadyExecuted.selector);
        registry.executeWill(fxCommitment, proof);
    }

    //////////////// LIFECYCLE ////////////////

    function test_CheckInCancelsGrace() public {
        _registerFixtureWill();
        vm.warp(block.timestamp + INACTIVITY + 1);
        registry.triggerGracePeriod(fxCommitment);
        assertTrue(registry.getWill(fxCommitment).graceStart != 0, "grace open");

        vm.prank(owner);
        registry.checkIn(fxCommitment);
        assertEq(registry.getWill(fxCommitment).graceStart, 0, "grace cancelled");

        // grace elapsed timing no longer applies; execute must fail
        vm.warp(block.timestamp + GRACE + 1);
        vm.expectRevert(InheritanceRegistry.GraceNotStarted.selector);
        registry.executeWill(fxCommitment, proof);
    }

    function test_TriggerGraceRevertsWhileActive() public {
        _registerFixtureWill();
        vm.expectRevert(InheritanceRegistry.StillActive.selector);
        registry.triggerGracePeriod(fxCommitment);
    }

    function test_VetoAtThresholdCancelsGrace() public {
        _registerFixtureWill(); // threshold is 1 in the default registry
        vm.warp(block.timestamp + INACTIVITY + 1);
        registry.triggerGracePeriod(fxCommitment);

        vm.prank(alice);
        registry.veto(fxCommitment);

        InheritanceRegistry.Will memory w = registry.getWill(fxCommitment);
        assertEq(w.graceStart, 0, "grace cancelled by veto");
        assertEq(w.vetoCount, 0, "veto count reset");

        vm.warp(block.timestamp + GRACE + 1);
        vm.expectRevert(InheritanceRegistry.GraceNotStarted.selector);
        registry.executeWill(fxCommitment, proof);
    }

    function test_VetoBelowThresholdAccumulates() public {
        // A dedicated registry with threshold 2 to observe accumulation.
        address[] memory m = new address[](2);
        m[0] = alice;
        m[1] = bob;
        InheritanceRegistry reg2 = new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            address(poseidonT3),
            address(poseidonT5),
            INACTIVITY,
            GRACE,
            m,
            2
        );
        vm.startPrank(owner);
        usdc.approve(address(reg2), fxUsdc);
        reg2.register{value: fxEth}(fxCommitment, fxRoot, fxEth, fxUsdc, 0);
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

    function test_VetoRevertsIfNotMember() public {
        _registerFixtureWill();
        vm.warp(block.timestamp + INACTIVITY + 1);
        registry.triggerGracePeriod(fxCommitment);
        vm.prank(anyone);
        vm.expectRevert(InheritanceRegistry.NotVetoMember.selector);
        registry.veto(fxCommitment);
    }

    //////////////// CLAIM ////////////////

    /// The on-chain Poseidon reproduces the circuit's hash_2([0,0]) exactly.
    function test_PoseidonMatchesCircuit() public view {
        assertEq(
            poseidonT3.poseidon([bytes32(0), bytes32(0)]),
            bytes32(0x2098f5fb9e239eab3ceac3f27b81e481dc3124d55ffed523a839ee8446b64864),
            "on-chain Poseidon must match noir/circomlib"
        );
    }

    /// The on-chain tree over the fixture beneficiary set equals the circuit's
    /// merkle_root that the ZK proof validated — ties Poseidon to the fixture.
    function test_OnChainTreeReproducesFixtureRoot() public view {
        (, , , bytes32 root) = _buildTree();
        assertEq(uint256(root), fxRoot, "on-chain root == circuit merkle_root");
    }

    function test_ClaimAllBeneficiariesDrainsEscrow() public {
        _registerAndExecute();
        (bytes32[8] memory bh, bytes32[4] memory l1, bytes32[2] memory l2, ) = _buildTree();

        // slot 0: addr 1000, 4 wei + 400 usdc
        vm.prank(address(1000));
        registry.claim(fxCommitment, 4, 400, 0, [bh[1], l1[1], l2[1]]);
        assertEq(address(1000).balance, 4, "b0 eth");
        assertEq(usdc.balanceOf(address(1000)), 400, "b0 usdc");

        // slot 1: addr 2000, 3 wei + 300 usdc
        vm.prank(address(2000));
        registry.claim(fxCommitment, 3, 300, 1, [bh[0], l1[1], l2[1]]);
        assertEq(address(2000).balance, 3, "b1 eth");
        assertEq(usdc.balanceOf(address(2000)), 300, "b1 usdc");

        // slot 2: addr 3000, 3 wei + 300 usdc
        vm.prank(address(3000));
        registry.claim(fxCommitment, 3, 300, 2, [bh[3], l1[0], l2[1]]);
        assertEq(address(3000).balance, 3, "b2 eth");
        assertEq(usdc.balanceOf(address(3000)), 300, "b2 usdc");

        // escrow fully drained (10 wei / 1000 usdc)
        assertEq(address(registry).balance, 0, "eth drained");
        assertEq(usdc.balanceOf(address(registry)), 0, "usdc drained");
    }

    function test_ClaimRevertsBeforeExecute() public {
        _registerFixtureWill(); // registered but not executed
        (bytes32[8] memory bh, bytes32[4] memory l1, bytes32[2] memory l2, ) = _buildTree();
        vm.prank(address(1000));
        vm.expectRevert(InheritanceRegistry.NotExecuted.selector);
        registry.claim(fxCommitment, 4, 400, 0, [bh[1], l1[1], l2[1]]);
    }

    function test_ClaimRevertsOnWrongAmount() public {
        _registerAndExecute();
        (bytes32[8] memory bh, bytes32[4] memory l1, bytes32[2] memory l2, ) = _buildTree();
        vm.prank(address(1000));
        vm.expectRevert(InheritanceRegistry.InvalidMerkleProof.selector);
        registry.claim(fxCommitment, 5, 400, 0, [bh[1], l1[1], l2[1]]); // 5 != 4
    }

    function test_ClaimRevertsForNonBeneficiary() public {
        _registerAndExecute();
        (bytes32[8] memory bh, bytes32[4] memory l1, bytes32[2] memory l2, ) = _buildTree();
        vm.prank(address(9999)); // not in the tree
        vm.expectRevert(InheritanceRegistry.InvalidMerkleProof.selector);
        registry.claim(fxCommitment, 4, 400, 0, [bh[1], l1[1], l2[1]]);
    }

    function test_ClaimRevertsOnDoubleClaim() public {
        _registerAndExecute();
        (bytes32[8] memory bh, bytes32[4] memory l1, bytes32[2] memory l2, ) = _buildTree();
        vm.startPrank(address(1000));
        registry.claim(fxCommitment, 4, 400, 0, [bh[1], l1[1], l2[1]]);
        vm.expectRevert(InheritanceRegistry.AlreadyClaimed.selector);
        registry.claim(fxCommitment, 4, 400, 0, [bh[1], l1[1], l2[1]]);
        vm.stopPrank();
    }

    function test_ClaimRevertsOnInvalidLeafIndex() public {
        _registerAndExecute();
        (bytes32[8] memory bh, bytes32[4] memory l1, bytes32[2] memory l2, ) = _buildTree();
        vm.prank(address(1000));
        vm.expectRevert(InheritanceRegistry.InvalidLeafIndex.selector);
        registry.claim(fxCommitment, 4, 400, 8, [bh[1], l1[1], l2[1]]); // index >= 8
    }
}
