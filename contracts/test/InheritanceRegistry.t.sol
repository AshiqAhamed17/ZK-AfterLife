// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import {InheritanceRegistry} from "../src/InheritanceRegistry.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";
import {WillVerifier} from "../src/WillVerifier.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockSelfVerifier} from "./mocks/MockSelfVerifier.sol";

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

    function setUp() public virtual {
        honk = new HonkVerifier();
        willVerifier = new WillVerifier(address(honk));
        usdc = new MockUSDC();
        self = new MockSelfVerifier();

        address[] memory vetoMembers = new address[](2);
        vetoMembers[0] = alice;
        vetoMembers[1] = bob;

        registry = new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            INACTIVITY,
            GRACE,
            vetoMembers,
            VETO_THRESHOLD
        );

        self.setVerified(owner, true);
        vm.deal(owner, 100 ether);
        usdc.mint(owner, 1_000_000e6);
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
        new InheritanceRegistry(address(0), address(self), address(usdc), INACTIVITY, GRACE, m, 1);
    }

    function test_ConstructorRejectsBadVetoThreshold() public {
        address[] memory m = new address[](1);
        m[0] = alice;
        vm.expectRevert(InheritanceRegistry.InvalidVetoThreshold.selector);
        new InheritanceRegistry(
            address(willVerifier),
            address(self),
            address(usdc),
            INACTIVITY,
            GRACE,
            m,
            2 // threshold > members
        );
    }
}
