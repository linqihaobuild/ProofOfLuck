import { useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, useChainId, useReadContract } from 'wagmi';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/ProofOfLuckApp.css';

function isZeroHandle(handle?: string) {
  return !handle || /^0x0{64}$/u.test(handle);
}

function parseDigits(digits: string): number[] | null {
  if (!/^[0-9]{6}$/u.test(digits)) return null;
  return digits.split('').map((d) => Number(d));
}

export function ProofOfLuckApp() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();

  const [digitsInput, setDigitsInput] = useState('');
  const [txStatus, setTxStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [decryptedPoints, setDecryptedPoints] = useState<string | null>(null);
  const [isDecryptingPoints, setIsDecryptingPoints] = useState(false);

  const [decryptedResult, setDecryptedResult] = useState<{
    winningNumber: string;
    matches: string;
    reward: string;
  } | null>(null);
  const [isDecryptingResult, setIsDecryptingResult] = useState(false);

  const digits = useMemo(() => parseDigits(digitsInput.trim()), [digitsInput]);
  const isSepolia = chainId === 11155111;
  const hasValidContractAddress = !/^0x0{40}$/u.test(CONTRACT_ADDRESS);

  const { data: ticketPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'TICKET_PRICE',
    query: { enabled: hasValidContractAddress },
  });

  const { data: hasActiveTicket, refetch: refetchHasActiveTicket } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'hasActiveTicket',
    args: address ? [address] : undefined,
    query: { enabled: hasValidContractAddress && !!address },
  });

  const { data: encryptedPoints, refetch: refetchEncryptedPoints } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPoints',
    args: address ? [address] : undefined,
    query: { enabled: hasValidContractAddress && !!address },
  });

  const { data: lastResult, refetch: refetchLastResult } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getLastResult',
    args: address ? [address] : undefined,
    query: { enabled: hasValidContractAddress && !!address },
  });

  const buyTicket = async () => {
    if (!isConnected || !address) {
      setTxStatus('Connect your wallet first.');
      return;
    }
    if (!isSepolia) {
      setTxStatus('Switch your wallet network to Sepolia.');
      return;
    }
    if (!hasValidContractAddress) {
      setTxStatus('Missing Sepolia deployment. Deploy and sync the frontend config.');
      return;
    }
    if (!instance) {
      setTxStatus(isZamaLoading ? 'Initializing encryption service...' : 'Encryption service unavailable.');
      return;
    }
    if (!digits) {
      setTxStatus('Enter exactly 6 digits (0-9).');
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setTxStatus('Signer not available.');
      return;
    }

    setIsSubmitting(true);
    setTxStatus('Encrypting ticket digits...');
    setDecryptedResult(null);

    try {
      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      for (const d of digits) input.add8(d);
      const encryptedInput = await input.encrypt();

      setTxStatus('Sending transaction...');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const value = typeof ticketPrice === 'bigint' ? ticketPrice : BigInt('1000000000000000');
      const tx = await contract.buyTicket(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.handles[4],
        encryptedInput.handles[5],
        encryptedInput.inputProof,
        { value },
      );

      setTxStatus(`Waiting for confirmation: ${tx.hash}`);
      await tx.wait();

      setTxStatus('Ticket purchased.');
      await Promise.all([refetchHasActiveTicket(), refetchLastResult()]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setTxStatus(`Failed to buy ticket: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const draw = async () => {
    if (!isConnected || !address) {
      setTxStatus('Connect your wallet first.');
      return;
    }
    if (!isSepolia) {
      setTxStatus('Switch your wallet network to Sepolia.');
      return;
    }
    if (!hasValidContractAddress) {
      setTxStatus('Missing Sepolia deployment. Deploy and sync the frontend config.');
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setTxStatus('Signer not available.');
      return;
    }

    setIsSubmitting(true);
    setTxStatus('Sending draw transaction...');

    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.draw();
      setTxStatus(`Waiting for confirmation: ${tx.hash}`);
      await tx.wait();

      setTxStatus('Draw completed.');
      setDecryptedPoints(null);
      setDecryptedResult(null);
      await Promise.all([refetchHasActiveTicket(), refetchLastResult(), refetchEncryptedPoints()]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setTxStatus(`Failed to draw: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const decryptHandles = async (handles: string[]) => {
    if (!instance || !address) {
      throw new Error('Missing encryption instance or wallet address');
    }

    const signer = await signerPromise;
    if (!signer) {
      throw new Error('Signer not available');
    }

    const keypair = instance.generateKeypair();
    const handleContractPairs = handles.map((handle) => ({ handle, contractAddress: CONTRACT_ADDRESS }));
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = '10';
    const contractAddresses = [CONTRACT_ADDRESS];

    const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
    const signature = await signer.signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message,
    );

    return instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace('0x', ''),
      contractAddresses,
      address,
      startTimeStamp,
      durationDays,
    ) as Promise<Record<string, string>>;
  };

  const decryptMyPoints = async () => {
    if (!encryptedPoints || typeof encryptedPoints !== 'string') return;
    if (isZeroHandle(encryptedPoints)) {
      setDecryptedPoints('0');
      return;
    }

    setIsDecryptingPoints(true);
    try {
      const result = await decryptHandles([encryptedPoints]);
      setDecryptedPoints(result[encryptedPoints] ?? '0');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setTxStatus(`Failed to decrypt points: ${message}`);
    } finally {
      setIsDecryptingPoints(false);
    }
  };

  const decryptLast = async () => {
    if (!lastResult || !Array.isArray(lastResult)) return;

    const w0 = lastResult[0] as string;
    const w1 = lastResult[1] as string;
    const w2 = lastResult[2] as string;
    const w3 = lastResult[3] as string;
    const w4 = lastResult[4] as string;
    const w5 = lastResult[5] as string;
    const matchesHandle = lastResult[6] as string;
    const rewardHandle = lastResult[7] as string;
    const exists = Boolean(lastResult[8]);

    if (!exists) return;

    setIsDecryptingResult(true);
    try {
      const result = await decryptHandles([w0, w1, w2, w3, w4, w5, matchesHandle, rewardHandle]);

      const winningNumber =
        `${result[w0] ?? '?'}` +
        `${result[w1] ?? '?'}` +
        `${result[w2] ?? '?'}` +
        `${result[w3] ?? '?'}` +
        `${result[w4] ?? '?'}` +
        `${result[w5] ?? '?'}`;

      setDecryptedResult({
        winningNumber,
        matches: result[matchesHandle] ?? '0',
        reward: result[rewardHandle] ?? '0',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setTxStatus(`Failed to decrypt result: ${message}`);
    } finally {
      setIsDecryptingResult(false);
    }
  };

  return (
    <div className="pol-app">
      <div className="pol-card">
        <h2 className="pol-title">Confidential Lottery</h2>

        {!hasValidContractAddress && (
          <div className="pol-warning">
            Frontend is not synced with the Sepolia deployment. Run the deployment and regenerate{' '}
            <code>src/src/config/contracts.ts</code>.
          </div>
        )}

        {zamaError && <div className="pol-warning">Encryption service error: {zamaError}</div>}

        <div className="pol-grid">
          <div className="pol-section">
            <h3 className="pol-section-title">1) Buy Ticket</h3>
            <label className="pol-label">6 digits</label>
            <input
              className="pol-input"
              placeholder="e.g. 123456"
              value={digitsInput}
              onChange={(e) => setDigitsInput(e.target.value)}
              maxLength={6}
              inputMode="numeric"
            />
            <button className="pol-button" onClick={buyTicket} disabled={isSubmitting || !digits}>
              Buy (0.001 ETH)
            </button>
            <div className="pol-muted">
              Active ticket: <strong>{hasActiveTicket ? 'Yes' : 'No'}</strong>
            </div>
          </div>

          <div className="pol-section">
            <h3 className="pol-section-title">2) Draw</h3>
            <button className="pol-button" onClick={draw} disabled={isSubmitting || !hasActiveTicket}>
              Start Draw
            </button>

            <div className="pol-subsection">
              <div className="pol-row">
                <span className="pol-muted">Last result</span>
                <button className="pol-link" onClick={decryptLast} disabled={isDecryptingResult || !lastResult}>
                  {isDecryptingResult ? 'Decrypting...' : 'Decrypt'}
                </button>
              </div>

              {decryptedResult ? (
                <div className="pol-result">
                  <div>
                    <span className="pol-muted">Winning number:</span> <strong>{decryptedResult.winningNumber}</strong>
                  </div>
                  <div>
                    <span className="pol-muted">Matches:</span> <strong>{decryptedResult.matches}</strong>
                  </div>
                  <div>
                    <span className="pol-muted">Reward points:</span> <strong>{decryptedResult.reward}</strong>
                  </div>
                </div>
              ) : (
                <div className="pol-muted pol-small">Encrypted handles are shown in the Points section.</div>
              )}
            </div>
          </div>

          <div className="pol-section">
            <h3 className="pol-section-title">3) My Points</h3>

            <div className="pol-row">
              <span className="pol-muted">Encrypted balance</span>
              <button className="pol-link" onClick={decryptMyPoints} disabled={isDecryptingPoints || !encryptedPoints}>
                {isDecryptingPoints ? 'Decrypting...' : 'Decrypt'}
              </button>
            </div>

            <div className="pol-codebox">
              <code>{typeof encryptedPoints === 'string' ? encryptedPoints : '0x0'}</code>
            </div>

            {decryptedPoints !== null && (
              <div className="pol-result">
                <span className="pol-muted">Clear points:</span> <strong>{decryptedPoints}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="pol-status">
          <div className="pol-status-label">Status</div>
          <div className="pol-status-value">{txStatus || 'Ready'}</div>
        </div>

        {!isConnected && <div className="pol-muted pol-small">Connect your wallet to start.</div>}
        {isConnected && !isSepolia && <div className="pol-warning">Please switch network to Sepolia.</div>}
      </div>
    </div>
  );
}

