import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function writeFrontendContractsFile(networkName: string, address: string, abi: unknown) {
  if (networkName !== "sepolia") return;

  const frontendFile = resolve(__dirname, "..", "src", "src", "config", "contracts.ts");
  if (!existsSync(frontendFile)) return;

  const content = `// Auto-generated from deployments/${networkName}/ProofOfLuck.json
// Do not edit manually. Re-run: npx hardhat deploy --network ${networkName}

export const CONTRACT_ADDRESS = "${address}" as const;
export const CONTRACT_ABI = ${JSON.stringify(abi, null, 2)} as const;
`;

  writeFileSync(frontendFile, content, "utf8");
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const deployed = await deploy("ProofOfLuck", {
    from: deployer,
    log: true,
  });

  console.log(`ProofOfLuck contract: `, deployed.address);

  const deployment = await get("ProofOfLuck");
  writeFrontendContractsFile(hre.network.name, deployment.address, deployment.abi);
};

export default func;
func.id = "deploy_proofOfLuck";
func.tags = ["ProofOfLuck"];

