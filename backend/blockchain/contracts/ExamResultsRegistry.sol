// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ExamResultsRegistry
 * @dev Stores exam results on blockchain to prevent tampering
 * @notice Tracks all result modifications with timestamps and addresses
 */

contract ExamResultsRegistry {
    
    struct ExamResult {
        string resultHash;           // Hash of result data
        address recordedBy;          // Who recorded this result (faculty/admin)
        uint256 timestamp;           // When it was recorded
        string examId;               // Link to exam database ID
        string studentId;            // Link to student database ID
        string resultData;           // Encrypted result metadata
        bool verified;               // If result has been verified
    }

    struct TamperAttempt {
        address attemptedBy;         // Who tried to tamper
        uint256 timestamp;           // When tampering was attempted
        string reason;               // Reason detected (hash mismatch, etc)
        string details;              // Additional details
    }

    // Mapping: resultHash => ExamResult (primary storage)
    mapping(bytes32 => ExamResult) public results;
    
    // Mapping: examId_studentId => latest resultHash
    mapping(string => bytes32) public latestResultHash;
    
    // Mapping: resultHash => array of tamper attempts
    mapping(bytes32 => TamperAttempt[]) public tamperLog;
    
    // All recorded result hashes (for audit trail)
    bytes32[] public allRecordedHashes;
    
    // Admin address (can verify and manage)
    address public admin;
    
    // Events
    event ResultRecorded(
        bytes32 indexed resultHash,
        string examId,
        string studentId,
        address indexed recordedBy,
        uint256 timestamp
    );
    
    event ResultVerified(
        bytes32 indexed resultHash,
        bool verified,
        uint256 timestamp
    );
    
    event TamperDetected(
        bytes32 indexed resultHash,
        address indexed detectedBy,
        string reason,
        uint256 timestamp
    );
    
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Record a new exam result on blockchain
     * @param _resultHash Hash of the result data
     * @param _examId Database exam ID
     * @param _studentId Database student ID
     * @param _resultData Encrypted result metadata
     */
    function recordResult(
        string memory _resultHash,
        string memory _examId,
        string memory _studentId,
        string memory _resultData
    ) public returns (bytes32) {
        bytes32 hashKey = keccak256(abi.encodePacked(_resultHash));
        
        require(results[hashKey].timestamp == 0, "Result already exists");
        
        ExamResult memory newResult = ExamResult({
            resultHash: _resultHash,
            recordedBy: msg.sender,
            timestamp: block.timestamp,
            examId: _examId,
            studentId: _studentId,
            resultData: _resultData,
            verified: false
        });
        
        results[hashKey] = newResult;
        
        string memory key = string(abi.encodePacked(_examId, "_", _studentId));
        latestResultHash[key] = hashKey;
        
        allRecordedHashes.push(hashKey);
        
        emit ResultRecorded(
            hashKey,
            _examId,
            _studentId,
            msg.sender,
            block.timestamp
        );
        
        return hashKey;
    }

    /**
     * @dev Verify if a result's hash matches what's stored
     * @param _resultHash The hash to verify
     * @param _currentHash Current calculated hash
     * @return true if hashes match (no tampering), false otherwise
     */
    function verifyResult(
        string memory _resultHash,
        string memory _currentHash
    ) public returns (bool) {
        bytes32 hashKey = keccak256(abi.encodePacked(_resultHash));
        
        require(results[hashKey].timestamp != 0, "Result not found");
        
        bytes32 currentHashKey = keccak256(abi.encodePacked(_currentHash));
        bool isValid = hashKey == currentHashKey;
        
        if (!isValid) {
            // Record tamper attempt
            TamperAttempt memory attempt = TamperAttempt({
                attemptedBy: msg.sender,
                timestamp: block.timestamp,
                reason: "Hash mismatch - possible tampering detected",
                details: string(abi.encodePacked(
                    "Expected: ", _resultHash, " Got: ", _currentHash
                ))
            });
            
            tamperLog[hashKey].push(attempt);
            
            emit TamperDetected(
                hashKey,
                msg.sender,
                "Hash mismatch",
                block.timestamp
            );
        }
        
        if (isValid && !results[hashKey].verified) {
            results[hashKey].verified = true;
            emit ResultVerified(hashKey, true, block.timestamp);
        }
        
        return isValid;
    }

    /**
     * @dev Get a recorded result
     * @param _resultHash The hash of the result
     */
    function getResult(string memory _resultHash)
        public
        view
        returns (ExamResult memory)
    {
        bytes32 hashKey = keccak256(abi.encodePacked(_resultHash));
        return results[hashKey];
    }

    /**
     * @dev Get the latest result for an exam-student pair
     * @param _examId Exam database ID
     * @param _studentId Student database ID
     */
    function getLatestResult(string memory _examId, string memory _studentId)
        public
        view
        returns (ExamResult memory)
    {
        string memory key = string(abi.encodePacked(_examId, "_", _studentId));
        bytes32 hashKey = latestResultHash[key];
        return results[hashKey];
    }

    /**
     * @dev Get tamper log for a result
     * @param _resultHash The hash of the result
     */
    function getTamperLog(string memory _resultHash)
        public
        view
        returns (TamperAttempt[] memory)
    {
        bytes32 hashKey = keccak256(abi.encodePacked(_resultHash));
        return tamperLog[hashKey];
    }

    /**
     * @dev Get all recorded result hashes
     */
    function getAllRecordedHashes() public view returns (bytes32[] memory) {
        return allRecordedHashes;
    }

    /**
     * @dev Change admin address
     */
    function changeAdmin(address _newAdmin) public {
        require(msg.sender == admin, "Only admin can change admin");
        address oldAdmin = admin;
        admin = _newAdmin;
        emit AdminChanged(oldAdmin, _newAdmin);
    }

    /**
     * @dev Check if a result exists
     */
    function resultExists(string memory _resultHash) public view returns (bool) {
        bytes32 hashKey = keccak256(abi.encodePacked(_resultHash));
        return results[hashKey].timestamp != 0;
    }

    /**
     * @dev Get total number of recorded results
     */
    function getTotalRecordedResults() public view returns (uint256) {
        return allRecordedHashes.length;
    }
}
