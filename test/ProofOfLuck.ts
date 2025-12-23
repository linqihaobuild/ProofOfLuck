import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ProofOfLuck, ProofOfLuck__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ProofOfLuck")) as ProofOfLuck__factory;
  const proofOfLuck = (await factory.deploy()) as ProofOfLuck;
  const proofOfLuckAddress = await proofOfLuck.getAddress();
  return { proofOfLuck, proofOfLuckAddress };
}

function expectedReward(matches: number): number {
  if (matches === 2) return 100;
  if (matches === 3) return 200;
  if (matches === 4) return 2000;
  if (matches === 5) return 10000;
  if (matches === 6) return 100000;
  return 0;
}

describe("ProofOfLuck", function () {
  let signers: Signers;
  let proofOfLuck: ProofOfLuck;
  let proofOfLuckAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ proofOfLuck, proofOfLuckAddress } = await deployFixture());
  });

  it("ticket price is 0.001 ether", async function () {
    const ticketPrice = await proofOfLuck.TICKET_PRICE();
    expect(ticketPrice).to.eq(ethers.parseEther("0.001"));
  });

  it("reverts when buying with incorrect ticket price", async function () {
    const encryptedDigits = await fhevm
      .createEncryptedInput(proofOfLuckAddress, signers.alice.address)
      .add8(1)
      .add8(2)
      .add8(3)
      .add8(4)
      .add8(5)
      .add8(6)
      .encrypt();

    await expect(
      proofOfLuck
        .connect(signers.alice)
        .buyTicket(
          encryptedDigits.handles[0],
          encryptedDigits.handles[1],
          encryptedDigits.handles[2],
          encryptedDigits.handles[3],
          encryptedDigits.handles[4],
          encryptedDigits.handles[5],
          encryptedDigits.inputProof,
          { value: 0 },
        ),
    ).to.be.revertedWithCustomError(proofOfLuck, "IncorrectTicketPrice");
  });

  it("buy ticket -> draw -> decrypt matches/reward/points", async function () {
    const digits = [1, 2, 3, 4, 5, 6];

    const encryptedDigits = await fhevm
      .createEncryptedInput(proofOfLuckAddress, signers.alice.address)
      .add8(digits[0])
      .add8(digits[1])
      .add8(digits[2])
      .add8(digits[3])
      .add8(digits[4])
      .add8(digits[5])
      .encrypt();

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

    expect(await proofOfLuck.hasActiveTicket(signers.alice.address)).to.eq(true);

    await (await proofOfLuck.connect(signers.alice).draw()).wait();

    expect(await proofOfLuck.hasActiveTicket(signers.alice.address)).to.eq(false);

    const last = await proofOfLuck.getLastResult(signers.alice.address);
    const winningEncryptedDigits = [last[0], last[1], last[2], last[3], last[4], last[5]];

    const winningDigits: bigint[] = [];
    for (const handle of winningEncryptedDigits) {
      winningDigits.push(await fhevm.userDecryptEuint(FhevmType.euint8, handle, proofOfLuckAddress, signers.alice));
    }

    const matches = digits.reduce((acc, v, i) => acc + (v === Number(winningDigits[i]) ? 1 : 0), 0);
    const reward = expectedReward(matches);

    const decryptedMatches = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      last[6],
      proofOfLuckAddress,
      signers.alice,
    );
    const decryptedReward = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      last[7],
      proofOfLuckAddress,
      signers.alice,
    );

    expect(Number(decryptedMatches)).to.eq(matches);
    expect(Number(decryptedReward)).to.eq(reward);

    const encryptedPoints = await proofOfLuck.getPoints(signers.alice.address);
    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedPoints,
      proofOfLuckAddress,
      signers.alice,
    );
    expect(Number(clearPoints)).to.eq(reward);
  });

  it("reverts draw when no active ticket", async function () {
    await expect(proofOfLuck.connect(signers.bob).draw()).to.be.revertedWithCustomError(proofOfLuck, "NoActiveTicket");
  });
});
