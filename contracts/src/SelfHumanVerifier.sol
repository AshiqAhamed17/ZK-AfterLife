// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SelfVerificationRoot } from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import { ISelfVerificationRoot } from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import { SelfStructs } from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import { IIdentityVerificationHubV2 } from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SelfHumanVerifier
 * @dev Smart contract for verifying human identity using Self Protocol
 * Supports both passport and Aadhaar verification methods
 * Integrates with ZK-AfterLife will registration system
 */
contract SelfHumanVerifier is SelfVerificationRoot, Ownable {
    
    ////////////// EVENTS //////////////
    
    event VerificationCompleted(
        address indexed userAddress,
        string verificationMethod,
        string nationality,
        bool ageVerified
    );
    
    event VerificationConfigUpdated(
        bytes32 indexed oldConfigId,
        bytes32 indexed newConfigId
    );
    
    ////////////// STORAGE //////////////
    
    /// @notice Mapping of user addresses to verification status
    mapping(address => bool) public verifiedHumans;
    
    /// @notice Mapping of user addresses to age verification status (18+)
    mapping(address => bool) public ageVerified;
    
    /// @notice Mapping of user addresses to verification method used
    mapping(address => string) public verificationMethod;
    
    /// @notice Mapping of user addresses to nationality
    mapping(address => string) public userNationality;
    
    /// @notice Total number of verified users
    uint256 public totalVerifiedUsers;
    
    /// @notice Minimum age requirement for verification
    uint256 public constant MINIMUM_AGE = 18;
    
    /// @notice Verification configuration ID for Self Protocol
    bytes32 public verificationConfigId;
    
    /// @notice Verification configuration for Self Protocol
    SelfStructs.VerificationConfigV2 public verificationConfig;
    
    ////////////// CONSTRUCTOR //////////////
    
    constructor(
        address identityVerificationHubV2Address,
        uint256 scope,
        bytes32 _verificationConfigId
    ) SelfVerificationRoot(identityVerificationHubV2Address, scope) Ownable(msg.sender) {
        verificationConfigId = _verificationConfigId;
    }
    
    ////////////// SELF PROTOCOL INTEGRATION //////////////
    
    /**
     * @notice Custom verification hook called by Self Protocol after successful verification
     * @param output The disclosed information from the user's identity document
     * @param userData Additional user data (if any)
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        address userAddress = address(uint160(output.userIdentifier));
        
        // Mark user as verified human
        verifiedHumans[userAddress] = true;
        
        // Check age requirement (18+)
        bool userAgeValid = output.olderThan >= MINIMUM_AGE;
        ageVerified[userAddress] = userAgeValid;
        
        // Determine verification method based on nationality
        string memory method;
        if (keccak256(abi.encodePacked(output.nationality)) == keccak256(abi.encodePacked("IND"))) {
            method = "aadhaar";
        } else {
            method = "passport";
        }
        
        verificationMethod[userAddress] = method;
        userNationality[userAddress] = output.nationality;
        
        // Increment total verified users
        totalVerifiedUsers++;
        
        emit VerificationCompleted(
            userAddress,
            method,
            output.nationality,
            userAgeValid
        );
    }
    
    ////////////// VIEW FUNCTIONS //////////////
    
    /**
     * @notice Check if a user is verified as a human
     * @param userAddress The address to check
     * @return isVerified True if the user is verified as a human
     */
    function isHumanVerified(address userAddress) external view returns (bool isVerified) {
        return verifiedHumans[userAddress];
    }
    
    /**
     * @notice Check if a user meets the age requirement (18+)
     * @param userAddress The address to check
     * @return ageValid True if the user is 18 or older
     */
    function isAgeValid(address userAddress) external view returns (bool ageValid) {
        return ageVerified[userAddress];
    }
    
    /**
     * @notice Check if a user is fully verified (human + age)
     * @param userAddress The address to check
     * @return fullyVerified True if the user is verified as human and meets age requirement
     */
    function isFullyVerified(address userAddress) external view returns (bool fullyVerified) {
        return verifiedHumans[userAddress] && ageVerified[userAddress];
    }
    
    /**
     * @notice Get verification details for a user
     * @param userAddress The address to check
     * @return isHuman True if verified as human
     * @return ageValid True if meets age requirement
     * @return method The verification method used ("passport" or "aadhaar")
     * @return nationality The user's nationality
     */
    function getUserVerificationDetails(address userAddress) 
        external 
        view 
        returns (
            bool isHuman,
            bool ageValid,
            string memory method,
            string memory nationality
        ) 
    {
        return (
            verifiedHumans[userAddress],
            ageVerified[userAddress],
            verificationMethod[userAddress],
            userNationality[userAddress]
        );
    }
    
    /**
     * @notice Get contract statistics
     * @return totalUsers Total number of verified users
     * @return minimumAge Minimum age requirement
     * @return configId Current verification configuration ID
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 totalUsers,
            uint256 minimumAge,
            bytes32 configId
        ) 
    {
        return (
            totalVerifiedUsers,
            MINIMUM_AGE,
            verificationConfigId
        );
    }
    
    ////////////// ADMIN FUNCTIONS //////////////
    
    /**
     * @notice Get verification configuration ID for cross-chain compatibility
     * @return configId The verification configuration ID
     */
    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32 configId) {
        return verificationConfigId;
    }
    
    /**
     * @notice Update verification configuration ID (only owner)
     * @param newConfigId The new verification configuration ID
     */
    function updateVerificationConfig(bytes32 newConfigId) external onlyOwner {
        bytes32 oldConfigId = verificationConfigId;
        verificationConfigId = newConfigId;
        
        emit VerificationConfigUpdated(oldConfigId, verificationConfigId);
    }
    
    /**
     * @notice Emergency function to revoke user verification (only owner)
     * @param userAddress The address to revoke verification for
     */
    function revokeVerification(address userAddress) external onlyOwner {
        require(verifiedHumans[userAddress], "User not verified");
        
        verifiedHumans[userAddress] = false;
        ageVerified[userAddress] = false;
        delete verificationMethod[userAddress];
        delete userNationality[userAddress];
        
        totalVerifiedUsers--;
    }
    
    /**
     * @notice Batch check verification status for multiple addresses
     * @param addresses Array of addresses to check
     * @return results Array of verification statuses
     */
    function batchCheckVerification(address[] calldata addresses) 
        external 
        view 
        returns (bool[] memory results) 
    {
        results = new bool[](addresses.length);
        for (uint256 i = 0; i < addresses.length; i++) {
            results[i] = verifiedHumans[addresses[i]] && ageVerified[addresses[i]];
        }
    }
}
