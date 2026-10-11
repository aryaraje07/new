import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read ABI
const abiPath = path.join(
  __dirname,
  "../blockchain/artifacts/contracts/ExamResultsRegistry.sol/ExamResultsRegistry.json"
);
const contractData = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
const CONTRACT_ABI = contractData.abi;

// Create provider (connects to local Hardhat network)
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Private key for transactions (from Hardhat default accounts)
const PRIVATE_KEY =
  process.env.BLOCKCHAIN_PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6c1fc7c823874998b69"; // Hardhat account 0

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract address - will be set in initializeBlockchain
let CONTRACT_ADDRESS = null;
let contract = null;

/**
 * Initialize blockchain service
 */
export async function initializeBlockchain() {
  try {
    // Read CONTRACT_ADDRESS from env (NOW that dotenv has loaded)
    CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

    if (!CONTRACT_ADDRESS) {
      console.warn(
        "⚠️  CONTRACT_ADDRESS not set. Blockchain features will be disabled."
      );
      return false;
    }

    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    console.log("✅ Blockchain service initialized");
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
    return true;
  } catch (error) {
    console.error("❌ Blockchain initialization failed:", error.message);
    return false;
  }
}

/**
 * Generate hash from result data
 */
function generateResultHash(examId, studentId, score, totalQuestions) {
  const data = `${examId}:${studentId}:${score}:${totalQuestions}:${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate consistent hash from result for verification
 */
function generateVerificationHash(examId, studentId, score, totalQuestions) {
  const data = `${examId}:${studentId}:${score}:${totalQuestions}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Record exam result on blockchain
 */
export async function recordResultOnBlockchain(resultData) {
  try {
    if (!contract) {
      console.warn(
        "⚠️  Blockchain not initialized. Result will not be recorded on chain."
      );
      return null;
    }

    const {
      examId,
      studentId,
      score,
      totalQuestions,
      metadata = "",
    } = resultData;

    // Generate hash
    const resultHash = generateResultHash(
      examId,
      studentId,
      score,
      totalQuestions
    );
    const verificationHash = generateVerificationHash(
      examId,
      studentId,
      score,
      totalQuestions
    );

    // Prepare encrypted metadata
    const encryptedMetadata = Buffer.from(
      JSON.stringify({
        score,
        totalQuestions,
        timestamp: new Date().toISOString(),
        metadata,
      })
    ).toString("base64");

    console.log(`📝 Recording result on blockchain...`);
    console.log(`   Exam ID: ${examId}`);
    console.log(`   Student ID: ${studentId}`);
    console.log(`   Score: ${score}/${totalQuestions}`);
    console.log(`   Hash: ${resultHash.substring(0, 16)}...`);

    // Call smart contract
    const tx = await contract.recordResult(
      resultHash,
      examId,
      studentId,
      encryptedMetadata
    );

    // Wait for transaction
    const receipt = await tx.wait();

    console.log(`✅ Result recorded on blockchain!`);
    console.log(`   Transaction Hash: ${receipt.hash}`);
    console.log(`   Block Number: ${receipt.blockNumber}`);

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      resultHash: resultHash,
      verificationHash: verificationHash,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    console.error("❌ Failed to record result on blockchain:", error.message);
    return null;
  }
}

/**
 * Verify result integrity
 */
export async function verifyResultIntegrity(examId, studentId, score, totalQuestions) {
  try {
    if (!contract) {
      console.warn("❌ Blockchain not initialized. Cannot verify result.");
      return { verified: false, reason: "Blockchain not initialized" };
    }

    const verificationHash = generateVerificationHash(
      examId,
      studentId,
      score,
      totalQuestions
    );

    console.log(`🔍 Verifying result integrity...`);
    console.log(`   Exam ID: ${examId}`);
    console.log(`   Student ID: ${studentId}`);
    console.log(`   Score: ${score}/${totalQuestions}`);

    // Call smart contract
    const isValid = await contract.verifyResult(
      verificationHash,
      verificationHash
    );

    if (isValid) {
      console.log(`✅ Result verified - No tampering detected!`);
      return {
        verified: true,
        tampered: false,
        timestamp: new Date().toISOString(),
      };
    } else {
      console.log(`⚠️  Result verification failed - Possible tampering detected!`);
      return {
        verified: false,
        tampered: true,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("❌ Failed to verify result:", error.message);
    return { verified: false, reason: error.message };
  }
}

/**
 * Get tamper attempts for a result
 */
export async function getTamperLog(resultHash) {
  try {
    if (!contract) {
      return { tamperLog: [], message: "Blockchain not initialized" };
    }

    const tamperLog = await contract.getTamperLog(resultHash);

    if (tamperLog.length === 0) {
      return {
        tamperLog: [],
        safe: true,
        message: "No tampering attempts detected",
      };
    }

    return {
      tamperLog: tamperLog.map((attempt) => ({
        attemptedBy: attempt.attemptedBy,
        timestamp: new Date(Number(attempt.timestamp) * 1000).toISOString(),
        reason: attempt.reason,
        details: attempt.details,
      })),
      safe: false,
      message: `${tamperLog.length} tampering attempt(s) detected!`,
    };
  } catch (error) {
    console.error("❌ Failed to get tamper log:", error.message);
    return { tamperLog: [], reason: error.message };
  }
}

/**
 * Get result from blockchain
 */
export async function getBlockchainResult(resultHash) {
  try {
    if (!contract) {
      return null;
    }

    const result = await contract.getResult(resultHash);

    if (!result || !result.resultHash) {
      return null;
    }

    return {
      resultHash: result.resultHash,
      recordedBy: result.recordedBy,
      timestamp: new Date(Number(result.timestamp) * 1000).toISOString(),
      examId: result.examId,
      studentId: result.studentId,
      resultData: result.resultData,
      verified: result.verified,
    };
  } catch (error) {
    console.error("❌ Failed to get result from blockchain:", error.message);
    return null;
  }
}

/**
 * Get audit trail for an exam-student pair
 */
export async function getAuditTrail(examId, studentId) {
  try {
    if (!contract) {
      return null;
    }

    const result = await contract.getLatestResult(examId, studentId);

    if (!result || !result.resultHash) {
      return null;
    }

    const tamperLog = await contract.getTamperLog(result.resultHash);

    return {
      result: {
        resultHash: result.resultHash,
        recordedBy: result.recordedBy,
        timestamp: new Date(Number(result.timestamp) * 1000).toISOString(),
        examId: result.examId,
        studentId: result.studentId,
        verified: result.verified,
      },
      tamperLog: tamperLog.map((attempt) => ({
        attemptedBy: attempt.attemptedBy,
        timestamp: new Date(Number(attempt.timestamp) * 1000).toISOString(),
        reason: attempt.reason,
        details: attempt.details,
      })),
      safe: tamperLog.length === 0,
    };
  } catch (error) {
    console.error("❌ Failed to get audit trail:", error.message);
    return null;
  }
}

/**
 * Get blockchain stats
 */
export async function getBlockchainStats() {
  try {
    if (!contract) {
      return null;
    }

    const totalResults = await contract.getTotalRecordedResults();
    const networkInfo = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    return {
      totalRecordedResults: Number(totalResults),
      chainId: Number(networkInfo.chainId),
      blockNumber: Number(blockNumber),
      contractAddress: CONTRACT_ADDRESS,
      network: "Hardhat Local",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Failed to get blockchain stats:", error.message);
    return null;
  }
}

/**
 * Check blockchain connection
 */
export async function checkBlockchainConnection() {
  try {
    const networkInfo = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    return {
      connected: true,
      network: networkInfo.name,
      chainId: Number(networkInfo.chainId),
      blockNumber: Number(blockNumber),
      contractAddress: CONTRACT_ADDRESS,
    };
  } catch (error) {
    console.error("❌ Blockchain connection failed:", error.message);
    return {
      connected: false,
      error: error.message,
    };
  }
}
