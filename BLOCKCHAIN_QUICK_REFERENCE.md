# 🔗 Blockchain Feature - Quick Reference

## What is This?

Your exam results are now stored on **Ethereum blockchain** to:
- 🛡️ Prevent tampering with marks
- 📝 Create immutable records
- 🔍 Track tampering attempts
- ✅ Verify result integrity anytime

## 30-Second Setup

**Terminal 1 - Blockchain Node:**
```bash
cd backend/blockchain && npx hardhat node
```
Keep this running! ⬅️ **VERY IMPORTANT**

**Terminal 2 - Deploy:**
```bash
cd backend/blockchain && npx hardhat run scripts/deploy.js --network localhost
# Copy CONTRACT_ADDRESS from output
```

**Add to backend/.env:**
```env
CONTRACT_ADDRESS=0x... (paste from above)
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6c1fc7c823874998b69
```

**Terminal 3 - Backend:**
```bash
cd backend && npm run dev
```

**Terminal 4 - Frontend:**
```bash
cd frontend && npm run dev
```

## How to Test

### Test 1: Auto-Record on Blockchain
1. Login as Student
2. Take an exam and submit
3. Check backend logs:
   ```
   ✅ Result recorded on blockchain!
   Transaction Hash: 0x...
   ```

### Test 2: Verify Result Integrity
1. Open Developer Console (F12) in Student Marksheet page
2. Or use curl/Postman:
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/blockchain/verify/EXAM_ATTEMPT_ID
   ```
3. Response shows: `"safe": true` ✅

### Test 3: Simulate Tampering (Admin Testing)
1. Student submits exam with score 8/10
2. Admin manually changes MongoDB to 10/10 (testing only!)
3. Call verify endpoint again
4. Response shows: `"tampered": true` ⚠️

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/blockchain/health` | Check blockchain connection |
| GET | `/api/blockchain/stats` | Blockchain statistics (admin only) |
| GET | `/api/blockchain/verify/:attemptId` | Verify exam result integrity |
| GET | `/api/blockchain/audit/:examId/:studentId` | Complete audit trail |
| GET | `/api/blockchain/records` | All blockchain records (admin only) |
| GET | `/api/blockchain/records/tampered` | Tampered records (admin only) |
| GET | `/api/blockchain/result/:resultHash` | Get specific result |

## Database Tables

### BlockchainRecord (New)
Stores reference to results on blockchain:
- `examAttempt` - Links to exam attempt
- `transactionHash` - Ethereum transaction
- `resultHash` - Hash of result data
- `blockNumber` - Which block it's in
- `tamperDetected` - If tampering found
- `tamperAttempts` - Count of tampering tries

## Files Created/Modified

### Created:
```
backend/
├── blockchain/
│   ├── contracts/ExamResultsRegistry.sol      ← Smart contract
│   ├── scripts/deploy.js                      ← Deploy script
│   ├── hardhat.config.js                      ← Config
│   └── package.json                           ← Dependencies
├── services/blockchainService.js              ← Backend integration
├── models/BlockchainRecord.js                 ← Data model
└── routes/blockchainRoutes.js                 ← API endpoints
```

### Modified:
```
backend/
├── server.js                                  ← Added blockchain init
├── controllers/studentExamController.js       ← Auto-record on submit
└── config/blockchain.config.js                ← Auto-generated
```

## Smart Contract

**ExamResultsRegistry** - Ethereum smart contract that:
1. Stores result hashes immutably
2. Verifies integrity by comparing hashes
3. Logs all tampering attempts
4. Tracks who made modifications
5. Provides audit trails

## Architecture Diagram

```
┌─────────────────┐
│   Student      │
│   Takes Exam   │
└────────┬────────┘
         │
         ✓ Answer Questions
         │
         ↓
┌─────────────────────────────┐
│  Backend Server             │
│  ├─ Calculate Score         │
│  ├─ Save to MongoDB         │
│  └─ Record on Blockchain ←─── Blockchain Service
└─────────────────────────────┘
         │
         ├─→ MongoDB (ExamAttempt + BlockchainRecord)
         │
         └─→ Ethereum Smart Contract (ExamResultsRegistry)
             ├─ Store Result Hash
             ├─ Store Block Number
             └─ Enable Verification
```

## Verification Flow

```
User calls: GET /api/blockchain/verify/{attemptId}
            │
            ├─ Get ExamAttempt from MongoDB
            ├─ Get BlockchainRecord
            ├─ Recalculate hash from current data
            ├─ Ask smart contract: "Does this match?"
            │
            ├─ Response: YES (not tampered) ✅
            │       └─ Show: "safe": true
            │
            └─ Response: NO (tampered!) ⚠️
                    ├─ Show: "tampered": true
                    ├─ Show: tamperLog with details
                    └─ Who attempted tampering
```

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Blockchain not initialized" | Start Terminal 1: `npx hardhat node` |
| "Connection refused" | Hardhat node isn't running |
| "No contract address" | Run deploy script: `npx hardhat run scripts/deploy.js --network localhost` |
| "Verification always fails" | Check if Hardhat node is still running |
| "Can't find BlockchainRecord" | Make sure exam was submitted AFTER blockchain started |

## Security Note

🔐 **This is using LOCAL blockchain (Hardhat)**

For production, deploy to:
- Ethereum Sepolia Testnet
- Polygon
- Other EVM chains

Use proper RPC providers (Alchemy, Infura) and manage private keys securely!

## Next Steps

1. ✅ Follow 30-second setup above
2. ✅ Test auto-recording on exam submit
3. ✅ Verify result integrity
4. ✅ Try tampering simulation (testing only!)
5. ✅ View audit trail
6. ✅ Check admin dashboard for all records

## Need Help?

Refer to: `BLOCKCHAIN_SETUP.md` (comprehensive guide with examples)

---

**🎉 Your results are now blockchain-protected!**
