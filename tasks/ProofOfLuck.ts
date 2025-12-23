import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

async function resolveProofOfLuckDeployment(hre: any, addressOverride?: string) {
  const { deployments } = hre;

  if (addressOverride) return { address: addressOverride };

  try {
    return await deployments.get("ProofOfLuck");
  } catch (e) {
    if (hre.network?.name === "hardhat") {
      await deployments.fixture(["ProofOfLuck"]);
      return await deployments.get("ProofOfLuck");
    }
    throw e;
  }
}

task("task:pol:address", "Prints the ProofOfLuck address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const deployment = await resolveProofOfLuckDeployment(hre);
  console.log("ProofOfLuck address is " + deployment.address);
});

task("task:pol:buy", "Buy a 6-digit ticket with encrypted digits")
  .addParam("digits", "A 6-digit string, e.g. 123456")
  .addOptionalParam("address", "Optionally specify the ProofOfLuck contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const digitsStr = String(taskArguments.digits);
    if (!/^[0-9]{6}$/u.test(digitsStr)) {
      throw new Error(`Argument --digits must be exactly 6 digits`);
    }
    const digits = digitsStr.split("").map((d) => Number(d));

    await fhevm.initializeCLIApi();

    const deployment = await resolveProofOfLuckDeployment(hre, taskArguments.address);
    const signers = await ethers.getSigners();
    const player = signers[0];

    const input = fhevm.createEncryptedInput(deployment.address, player.address);
    for (const d of digits) input.add8(d);
    const encryptedInput = await input.encrypt();

    const contract = await ethers.getContractAt("ProofOfLuck", deployment.address);
    const tx = await contract
      .connect(player)
      .buyTicket(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.handles[4],
        encryptedInput.handles[5],
        encryptedInput.inputProof,
        { value: ethers.parseEther("0.001") },
      );

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:pol:draw", "Draw winning digits and update encrypted points")
  .addOptionalParam("address", "Optionally specify the ProofOfLuck contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;

    const deployment = await resolveProofOfLuckDeployment(hre, taskArguments.address);
    const signers = await ethers.getSigners();
    const player = signers[0];

    const contract = await ethers.getContractAt("ProofOfLuck", deployment.address);
    const tx = await contract.connect(player).draw();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:pol:decrypt-points", "Decrypt your encrypted points balance")
  .addOptionalParam("address", "Optionally specify the ProofOfLuck contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = await resolveProofOfLuckDeployment(hre, taskArguments.address);
    const signers = await ethers.getSigners();
    const player = signers[0];

    const contract = await ethers.getContractAt("ProofOfLuck", deployment.address);
    const encryptedPoints = await contract.getPoints(player.address);
    if (encryptedPoints === ethers.ZeroHash) {
      console.log("Encrypted points: 0x0");
      console.log("Clear points    : 0");
      return;
    }

    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedPoints,
      deployment.address,
      player,
    );
    console.log(`Encrypted points: ${encryptedPoints}`);
    console.log(`Clear points    : ${clearPoints}`);
  });

task("task:pol:sync-frontend", "Generate frontend ABI/address file from deployments/<network>/ProofOfLuck.json")
  .addOptionalParam("out", "Output TS file path", resolve("src", "src", "config", "contracts.ts"))
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const networkName = hre.network.name;
    const deploymentFile = resolve("deployments", networkName, "ProofOfLuck.json");
    if (!existsSync(deploymentFile)) {
      throw new Error(`Missing deployment file: ${deploymentFile}`);
    }

    const deployment = JSON.parse(readFileSync(deploymentFile, "utf8")) as { address: string; abi: unknown };
    const outPath = resolve(String(taskArguments.out));

    const content = `// Auto-generated from deployments/${networkName}/ProofOfLuck.json
// Do not edit manually. Re-run: npx hardhat task:pol:sync-frontend --network ${networkName}

export const CONTRACT_ADDRESS = "${deployment.address}" as const;
export const CONTRACT_ABI = ${JSON.stringify(deployment.abi, null, 2)} as const;
`;

    writeFileSync(outPath, content, "utf8");
    console.log(`Wrote ${outPath}`);
  });
