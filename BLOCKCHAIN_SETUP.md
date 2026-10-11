# 🔗 Blockchain Integration - Setup & Testing Guide

## Overview

Your exam results are now stored on a blockchain (Ethereum-based) to:
- ✅ Prevent tampering with student marks
- ✅ Track who attempted to modify results
- ✅ Create an immutable audit trail
- ✅ Enable verification of result integrity

## Architecture

```
Student submits exam
        ↓
Backend calculates score
        ↓
Result stored in MongoDB (ExamAttempt)
        ↓
🔗 Result hash recorded on blockchain
        ↓
Blockchain reference saved in MongoDB (BlockchainRecord)
        ↓
Student can verify integrity anytime
```

## Setup Steps

### Phase 1: Install Dependencies

#### 1.1 Install Blockchain Dev Tools

Windows PowerShell:
```powershell
cd backend
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers
npm install ethers crypto
```

#### 1.2 Verify Installation

```powershell
npx hardhat --version
```

Expected output: `hardhat v2.x.x`

### Phase 2: Compile Smart Contract

```powershell
cd blockchain
npx hardhat compile
```

✅ You should see:
```
Compiling 1 file with 0.8.20
Compilation successful!
Successfully generated 1 artifact(s)
```

**What was created:**
- `blockchain/artifacts/contracts/ExamResultsRegistry.sol/ExamResultsRegistry.json` - ABI file (needed for interaction)

### Phase 3: Start Local Blockchain Network

**Terminal 1 - Blockchain Node:**
```powershell
cd backend/blockchain
npx hardhat node
```

✅ You should see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545

Accounts (these are your test accounts):
Account #0: 0x1234... (10000 ETH)
Account #1: 0x5678... (10000 ETH)
...
```

**IMPORTANT:** Keep this terminal running! This is your local blockchain network.

### Phase 4: Deploy Smart Contract

**Terminal 2 - Deployment:**
```powershell
cd backend/blockchain
npx hardhat run scripts/deploy.js --network localhost
```

✅ You should see:
```
⏳ Deploying ExamResultsRegistry...
✅ ExamResultsRegistry deployed!
📍 Contract Address: 0x1234567890abcdef...
🌐 Network: Hardhat Local Network

💾 Configuration saved to: backend/config/blockchain.config.js
```

**IMPORTANT:** Copy the contract address from the output. You'll need it next.

### Phase 5: Configure Environment

In `backend/.env`, add:

```env
# Blockchain Configuration
CONTRACT_ADDRESS=0x1234567890abcdef... # (paste from deploy output)
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6c1fc7c823874998b69
BLOCKCHAIN_NETWORK=localhost
```

### Phase 6: Start Backend Server

**Terminal 3 - Backend:**
```powershell
cd backend
npm run dev
```

✅ You should see:
```
🚀 Server running on port 5000
✅ Blockchain service initialized
🔌 Socket.io enabled for real-time communication
```

### Phase 7: Start Frontend

**Terminal 4 - Frontend:**
```powershell
cd frontend
npm run dev
```

## Testing the Blockchain Feature

### Test 1: Record Result on Blockchain (Automatic)

**What happens:**
When a student submits an exam, the result is automatically recorded on blockchain.

**Steps:**
1. Login as Student (e.g., student1)
2. Go to **Scheduled Exams** → Click on an exam
3. Answer questions and **Submit**
4. You should see:
   ```
   ✅ Exam submitted
   📝 Result recorded on blockchain
   🔗 Transaction Hash: 0x...
   ```

**Backend Logs:**
```
📝 Attempting to record result on blockchain...
📝 Recording result on blockchain...
   Exam ID: 123...
   Student ID: STU-571120
   Score: 8/10
   Hash: a1b2c3d4...
✅ Result recorded on blockchain!
   Transaction Hash: 0x...
   Block Number: 5
```

### Test 2: Verify Result Integrity

**Endpoint:** `GET /api/blockchain/verify/:examAttemptId`

**Using Postman/curl:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/blockchain/verify/EXAM_ATTEMPT_ID
```

**Response:**
```json
{
  "examAttempt": {
    "id": "...",
    "exam": "Math Final Exam",
    "student": "John Doe",
    "score": 8,
    "totalQuestions": 10,
    "submittedAt": "2026-02-22T10:30:00Z"
  },
  "blockchain": {
    "transactionHash": "0x...",
    "blockNumber": 5,
    "resultHash": "a1b2c3d4...",
    "verified": true
  },
  "integrity": {
    "verified": true,
    "tampered": false,
    "timestamp": "2026-02-22T10:35:00Z"
  },
  "tamperLog": {
    "tamperLog": [],
    "safe": true
  },
  "safe": true
}
```

### Test 3: Check Blockchain Health

**Endpoint:** `GET /api/blockchain/health`

```bash
curl http://localhost:5000/api/blockchain/health
```

**Response:**
```json
{
  "connected": true,
  "network": "unknown",
  "chainId": 31337,
  "blockNumber": 5,
  "contractAddress": "0x..."
}
```

### Test 4: Get Blockchain Statistics

**Endpoint:** `GET /api/blockchain/stats` (requires authentication)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/blockchain/stats
```

**Response:**
```json
{
  "totalRecordedResults": 3,
  "chainId": 31337,
  "blockNumber": 8,
  "contractAddress": "0x...",
  "network": "Hardhat Local",
  "timestamp": "2026-02-22T10:40:00Z"
}
```

### Test 5: Simulate Tampering Detection

**What we're testing:** If someone tries to modify the marks in the database, the blockchain will detect it.

**Scenario:**
1. Student submits exam with score 8/10
2. Admin manually changes MongoDB record to 10/10
3. Try to verify - system detects tampering!

**Steps:**

**Step 1:** Get exam attempt ID after student submits

**Step 2:** Manually modify the MongoDB record (for testing only!):
```bash
# In MongoDB compass or terminal
db.examattempts.updateOne(
  { _id: ObjectId("...") },
  { $set: { score: 10 } }
)
```

**Step 3:** Call verify endpoint:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/blockchain/verify/EXAM_ATTEMPT_ID
```

**Response:**
```json
{
  "integrity": {
    "verified": false,
    "tampered": true,
    "timestamp": "2026-02-22T10:45:00Z"
  },
  "safe": false
}
```

**Backend Logs:**
```
🔍 Verifying result integrity...
   Exam ID: 123...
   Student ID: STU-571120
   Score: 10/10
⚠️  Result verification failed - Possible tampering detected!
```

This proves the blockchain caught the tampering!

### Test 6: Get Tamper Log

**Endpoint:** `GET /api/blockchain/audit/:examId/:studentId`

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/blockchain/audit/EXAM_ID/STUDENT_ID
```

**Response (if tampered):**
```json
{
  "result": {
    "resultHash": "a1b2c3d4...",
    "recordedBy": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "timestamp": "2026-02-22T10:30:00Z",
    "examId": "123...",
    "studentId": "STU-571120",
    "verified": true
  },
  "tamperLog": [
    {
      "attemptedBy": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "timestamp": "2026-02-22T10:45:00Z",
      "reason": "Hash mismatch - possible tampering detected",
      "details": "Expected: a1b2c3d4... Got: x9z8y7w6..."
    }
  ],
  "safe": false
}
```

### Test 7: Admin View All Blockchain Records

**Endpoint:** `GET /api/blockchain/records?page=1&limit=20`

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/blockchain/records
```

**Response:**
```json
{
  "records": [
    {
      "_id": "...",
      "examAttempt": {
        "_id": "...",
        "score": 8,
        "totalQuestions": 10,
        "submittedAt": "2026-02-22T10:30:00Z"
      },
      "transactionHash": "0x...",
      "blockNumber": 5,
      "resultHash": "a1b2c3d4...",
      "verified": true,
      "tamperDetected": false,
      "createdAt": "2026-02-22T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "pages": 1
  }
}
```

### Test 8: View Tampering Attempts (Admin Only)

**Endpoint:** `GET /api/blockchain/records/tampered`

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:5000/api/blockchain/records/tampered
```

## Complete Testing Workflow

### Setup (Once)
1. Stop all previous terminals
2. Terminal 1: `cd backend/blockchain && npx hardhat node`
3. Terminal 2: `cd backend/blockchain && npx hardhat run scripts/deploy.js --network localhost`
4. Copy contract address to `.env`
5. Terminal 3: `cd backend && npm run dev`
6. Terminal 4: `cd frontend && npm run dev`

### Full Test Scenario
```
1. Login as Student
   └─ Go to Scheduled Exams

2. Take Exam
   ├─ Answer questions
   ├─ Submit exam
   └─ See blockchain confirmation

3. Check Blockchain Status
   ├─ Backend logs show transaction hash
   ├─ MongoDB has BlockchainRecord
   └─ Result on blockchain!

4. Verify Integrity (Admin)
   ├─ Open DevTools or API
   ├─ Call /api/blockchain/verify/{attemptId}
   ├─ See: "safe": true
   └─ ✅ Verification passed!

5. Test Tampering (Admin - Testing Only!)
   ├─ Manually modify MongoDB score
   ├─ Call verify again
   ├─ See: "tampered": true
   ├─ See tamper log with details
   └─ ✅ Tampering detected!

6. View Audit Trail
   ├─ Call /api/blockchain/audit/{examId}/{studentId}
   ├─ See all modifications
   ├─ See who attempted tampering
   └─ ✅ Full audit trail visible!
```

## Database Schema

### ExamAttempt (existing - unchanged)
```
{
  exam: Ref to Exam,
  student: Ref to User,
  score: Number,
  totalQuestions: Number,
  answers: Array,
  submittedAt: Date,
  status: "SUBMITTED" | "AUTO_SUBMITTED",
  ...
}
```

### BlockchainRecord (new)
```
{
  examAttempt: Ref to ExamAttempt,
  transactionHash: String (Ethereum tx hash),
  resultHash: String (SHA-256 hash of result),
  verificationHash: String (for integrity check),
  blockNumber: Number,
  gasUsed: String,
  status: "CONFIRMED",
  verified: Boolean,
  tamperDetected: Boolean,
  tamperAttempts: Number,
  lastVerifiedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Smart Contract Details

### Contract: ExamResultsRegistry.sol

**Key Functions:**

1. **recordResult(resultHash, examId, studentId, resultData)**
   - Records a new exam result on blockchain
   - Emits `ResultRecorded` event
   - Returns transaction hash

2. **verifyResult(resultHash, currentHash)**
   - Verifies if result has been tampered with
   - Compares stored hash with current hash
   - Logs tampering attempts
   - Emits `TamperDetected` event if mismatch

3. **getTamperLog(resultHash)**
   - Gets all tampering attempts for a result
   - Shows who attempted, when, and why

4. **getLatestResult(examId, studentId)**
   - Gets the latest result for an exam-student pair
   - Prevents duplicate results

5. **getAuditTrail(examId, studentId)**
   - Complete history of a result
   - All modifications and verification attempts

## Troubleshooting

### ❌ "Blockchain not initialized"
```
Solution:
1. Check if Hardhat node is running (Terminal 1)
2. Check if CONTRACT_ADDRESS is set in .env
3. Check backend console for blockchain initialization message
4. Try restarting backend: npm run dev
```

### ❌ "Connection refused at 127.0.0.1:8545"
```
Solution:
1. Terminal 1 is not running Hardhat node
2. Run: npx hardhat node
3. Backend will automatically connect
```

### ❌ "Contract address not found"
```
Solution:
1. Run deployment script again:
   npx hardhat run scripts/deploy.js --network localhost
2. Copy new address to .env
3. Restart backend
```

### ❌ "No accounts found for signing"
```
Solution:
1. Check BLOCKCHAIN_PRIVATE_KEY in .env
2. Use default: 0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6c1fc7c823874998b69
3. This is first account from Hardhat node
```

### ❌ "Blockchain record not found"
```
Solution:
1. Make sure exam was submitted AFTER blockchain started
2. Check backend logs for blockchain recording
3. If no blockchain, ensure Hardhat node running
4. Check MongoDB BlockchainRecord collection
```

## File Structure

```
backend/
├── blockchain/
│   ├── hardhat.config.js          # Hardhat configuration
│   ├── contracts/
│   │   └── ExamResultsRegistry.sol    # Smart contract
│   ├── scripts/
│   │   └── deploy.js              # Deployment script
│   └── artifacts/                 # Compiled contracts (auto-generated)
├── services/
│   └── blockchainService.js        # Blockchain interaction service
├── models/
│   └── BlockchainRecord.js         # MongoDB model for blockchain records
├── routes/
│   └── blockchainRoutes.js         # API endpoints
├── controllers/
│   └── studentExamController.js    # Updated to record on blockchain
├── config/
│   └── blockchain.config.js        # Contract address (auto-generated)
└── .env                            # CONTRACT_ADDRESS, BLOCKCHAIN_PRIVATE_KEY
```

## How It Works (Technical)

### When Student Submits Exam:

1. **Calculate Score**
   ```javascript
   score = 8 (out of 10)
   ```

2. **Create Verification Hash**
   ```javascript
   hash = SHA256("examId_studentId_8_10")
   // Result: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

3. **Record on Blockchain**
   ```solidity
   // Smart contract function
   recordResult(
     resultHash="a1b2c3d4...",
     examId="123...",
     studentId="STU-571120",
     resultData="base64_encrypted_data"
   )
   // Returns transaction hash: 0x...
   ```

4. **Store in MongoDB**
   ```javascript
   BlockchainRecord.create({
     examAttempt: ObjectId("..."),
     transactionHash: "0x...",
     resultHash: "a1b2c3d4...",
     verificationHash: "a1b2c3d4...",
     blockNumber: 5,
     gasUsed: "95000",
     status: "CONFIRMED"
   })
   ```

### When Verifying Integrity:

1. **Get Current Score from DB**
   ```javascript
   current_score = 8
   ```

2. **Calculate Current Hash**
   ```javascript
   current_hash = SHA256("examId_studentId_8_10")
   // Result: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

3. **Compare with Blockchain**
   ```solidity
   // Smart contract function
   isValid = verifyResult(
     originalHash="a1b2c3d4...",
     currentHash="a1b2c3d4..."
   )
   // If they match: NOT TAMPERED ✅
   // If different: TAMPERED ⚠️
   ```

4. **Return Result**
   ```json
   {
     "verified": true,
     "tampered": false,
     "tamperLog": []
   }
   ```

## Security Considerations

### ✅ What's Protected:
- Score values cannot be changed without detection
- Tampering attempts are logged with addresses
- Modification history is immutable
- Results are timestamped and block-numbered

### ⚠️ What to Remember:
- This uses a LOCAL blockchain (Hardhat). Production should use:
  - Ethereum Mainnet / Testnet
  - Polygon (faster, cheaper)
  - Other EVM-compatible chains
- Private keys should be managed securely (use env vars!)
- Only authorized personnel can initiate modifications

### 🔒 Production Deployment:
```javascript
// Would use Alchemy, Infura, or other RPC providers
// Instead of local http://127.0.0.1:8545
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS=0x... (deployed on Sepolia)
BLOCKCHAIN_PRIVATE_KEY=... (admin wallet)
```

## Summary

Your exam results are now on a **blockchain!** 🎉

✅ **Tamper-proof:** Marks cannot be changed without detection
✅ **Auditable:** Every modification is tracked
✅ **Verifiable:** Students can verify their own results
✅ **Transparent:** Admin can see all tampering attempts
✅ **Immutable:** Records are saved permanently

### Quick Commands:
```bash
# Start Hardhat node
npm run blockchain:node

# Deploy contract
npm run blockchain:deploy

# Start backend with blockchain
npm run dev

# Run tests
npm run test:blockchain
```

Good luck! 🚀
