import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { deployments, ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ProofOfLuck } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

function expectedReward(matches: number): number {
  if (matches === 2) return 100;
  if (matches === 3) return 200;
  if (matches === 4) return 2000;
  if (matches === 5) return 10000;
  if (matches === 6) return 100000;
  return 0;
}

describe("ProofOfLuckSepolia", function () {
  let signers: Signers;
  let proofOfLuck: ProofOfLuck;
  let proofOfLuckAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("ProofOfLuck");
      proofOfLuckAddress = deployment.address;
      proofOfLuck = await ethers.getContractAt("ProofOfLuck", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("buy ticket -> draw -> decrypt points", async function () {
    steps = 9;
    this.timeout(4 * 60000);

    const digits = [1, 2, 3, 4, 5, 6];

    progress("Encrypting 6 digits...");
    const encryptedDigits = await fhevm
      .createEncryptedInput(proofOfLuckAddress, signers.alice.address)
      .add8(digits[0])
      .add8(digits[1])
      .add8(digits[2])
      .add8(digits[3])
      .add8(digits[4])
      .add8(digits[5])
      .encrypt();

    progress("Buying ticket...");
    await (await proofOfLuck.connect(signers.alice).buyTicket(
      encryptedDigits.handles[0],
      encryptedDigits.handles[1],
      encryptedDigits.handles[2],
      encryptedDigits.handles[3],
      encryptedDigits.handles[4],
      encryptedDigits.handles[5],
      encryptedDigits.inputProof,
      { value: ethers.parseEther("0.001") },
    )).wait();

    progress("Drawing...");
    await (await proofOfLuck.connect(signers.alice).draw()).wait();

    progress("Reading last result...");
    const last = await proofOfLuck.getLastResult(signers.alice.address);
    expect(last[8]).to.eq(true);

    progress("Decrypting winning digits...");
    const winningEncryptedDigits = [last[0], last[1], last[2], last[3], last[4], last[5]];
    const winningDigits: bigint[] = [];
    for (const handle of winningEncryptedDigits) {
      winningDigits.push(await fhevm.userDecryptEuint(FhevmType.euint8, handle, proofOfLuckAddress, signers.alice));
    }

    const matches = digits.reduce((acc, v, i) => acc + (v === Number(winningDigits[i]) ? 1 : 0), 0);
    const reward = expectedReward(matches);

    progress("Decrypting reward...");
    const decryptedReward = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      last[7],
      proofOfLuckAddress,
      signers.alice,
    );
    expect(Number(decryptedReward)).to.eq(reward);

    progress("Decrypting points...");
    const encryptedPoints = await proofOfLuck.getPoints(signers.alice.address);
    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedPoints,
      proofOfLuckAddress,
      signers.alice,
    );

    progress(`Points=${clearPoints}`);
    expect(Number(clearPoints)).to.gte(reward);
  });
});
