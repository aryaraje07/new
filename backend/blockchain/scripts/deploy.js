const hardhat = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("⏳ Deploying ExamResultsRegistry...");

  const ExamResultsRegistry = await hardhat.ethers.getContractFactory(
    "ExamResultsRegistry"
  );
  const contract = await ExamResultsRegistry.deploy();

  await contract.deploymentTransaction()?.wait();

  const contractAddress = await contract.getAddress();
  console.log("\n✅ ExamResultsRegistry deployed!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Hardhat Local Network`);

  // Save contract address to file for backend use
  const configPath = path.join(
    process.cwd(),
    "..",
    "config",
    "blockchain.config.js"
  );

  const configContent = `export const BLOCKCHAIN_CONFIG = {
  CONTRACT_ADDRESS: "${contractAddress}",
  NETWORK: "localhost",
  RPC_URL: "http://127.0.0.1:8545",
  DEPLOYER_ADDRESS: "${contract.runner?.address || "0x0"}",
};
`;

  fs.writeFileSync(configPath, configContent);
  console.log(
    `\n💾 Configuration saved to: backend/config/blockchain.config.js`
  );

  // Display usage info
  console.log("\n📖 DEPLOYMENT INFO:");
  console.log("==================");
  console.log("✅ Deployment successful!");
  console.log(
    "📝 Contract Address (copy this to your config): " + contractAddress
  );
  console.log("\n🚀 Next steps:");
  console.log("1. Keep Hardhat node running: npx hardhat node");
  console.log("2. Update backend/.env with CONTRACT_ADDRESS");
  console.log("3. Run backend with: npm run dev");
  console.log("4. Exam results will now be stored on blockchain!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
