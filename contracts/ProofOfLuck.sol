// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint64, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ProofOfLuck
/// @notice Confidential lottery: players buy a 6-digit ticket (encrypted) and draw an encrypted 6-digit random number.
/// @dev Points are stored encrypted and can be user-decrypted off-chain using Zama Relayer SDK.
contract ProofOfLuck is ZamaEthereumConfig {
    uint256 public constant TICKET_PRICE = 0.001 ether;

    struct Ticket {
        euint8 d0;
        euint8 d1;
        euint8 d2;
        euint8 d3;
        euint8 d4;
        euint8 d5;
        bool active;
    }

    struct DrawResult {
        euint8 w0;
        euint8 w1;
        euint8 w2;
        euint8 w3;
        euint8 w4;
        euint8 w5;
        euint8 matchesCount;
        euint64 rewardPoints;
        bool exists;
    }

    mapping(address => Ticket) private _tickets;
    mapping(address => DrawResult) private _lastResults;
    mapping(address => euint64) private _points;

    event TicketPurchased(address indexed player);
    event DrawCompleted(address indexed player);

    error IncorrectTicketPrice(uint256 expected, uint256 actual);
    error NoActiveTicket();

    /// @notice Returns whether a user currently has an active ticket.
    /// @dev View method must not depend on msg.sender.
    function hasActiveTicket(address user) external view returns (bool) {
        return _tickets[user].active;
    }

    /// @notice Returns the encrypted points balance for a user.
    /// @dev View method must not depend on msg.sender.
    function getPoints(address user) external view returns (euint64) {
        return _points[user];
    }

    /// @notice Returns the current ticket (encrypted digits) for a user.
    /// @dev View method must not depend on msg.sender.
    function getTicket(
        address user
    ) external view returns (euint8 d0, euint8 d1, euint8 d2, euint8 d3, euint8 d4, euint8 d5, bool active) {
        Ticket storage t = _tickets[user];
        return (t.d0, t.d1, t.d2, t.d3, t.d4, t.d5, t.active);
    }

    /// @notice Returns the latest draw result for a user (encrypted winning digits, matches count, and reward).
    /// @dev View method must not depend on msg.sender.
    function getLastResult(
        address user
    )
        external
        view
        returns (
            euint8 w0,
            euint8 w1,
            euint8 w2,
            euint8 w3,
            euint8 w4,
            euint8 w5,
            euint8 matchesCount,
            euint64 rewardPoints,
            bool exists
        )
    {
        DrawResult storage r = _lastResults[user];
        return (r.w0, r.w1, r.w2, r.w3, r.w4, r.w5, r.matchesCount, r.rewardPoints, r.exists);
    }

    /// @notice Buy a ticket by submitting 6 encrypted digits.
    /// @param d0 Encrypted digit 0
    /// @param d1 Encrypted digit 1
    /// @param d2 Encrypted digit 2
    /// @param d3 Encrypted digit 3
    /// @param d4 Encrypted digit 4
    /// @param d5 Encrypted digit 5
    /// @param inputProof Zama input proof
    function buyTicket(
        externalEuint8 d0,
        externalEuint8 d1,
        externalEuint8 d2,
        externalEuint8 d3,
        externalEuint8 d4,
        externalEuint8 d5,
        bytes calldata inputProof
    ) external payable {
        if (msg.value != TICKET_PRICE) {
            revert IncorrectTicketPrice(TICKET_PRICE, msg.value);
        }

        Ticket storage t = _tickets[msg.sender];
        t.d0 = _normalizeDigit(FHE.fromExternal(d0, inputProof));
        t.d1 = _normalizeDigit(FHE.fromExternal(d1, inputProof));
        t.d2 = _normalizeDigit(FHE.fromExternal(d2, inputProof));
        t.d3 = _normalizeDigit(FHE.fromExternal(d3, inputProof));
        t.d4 = _normalizeDigit(FHE.fromExternal(d4, inputProof));
        t.d5 = _normalizeDigit(FHE.fromExternal(d5, inputProof));
        t.active = true;

        _allowTicket(t, msg.sender);
        emit TicketPurchased(msg.sender);
    }

    /// @notice Draw a random encrypted 6-digit number, compare with your ticket, and award encrypted points.
    function draw() external {
        Ticket storage t = _tickets[msg.sender];
        if (!t.active) {
            revert NoActiveTicket();
        }

        DrawResult storage r = _lastResults[msg.sender];
        r.w0 = _normalizeDigit(FHE.randEuint8());
        r.w1 = _normalizeDigit(FHE.randEuint8());
        r.w2 = _normalizeDigit(FHE.randEuint8());
        r.w3 = _normalizeDigit(FHE.randEuint8());
        r.w4 = _normalizeDigit(FHE.randEuint8());
        r.w5 = _normalizeDigit(FHE.randEuint8());

        euint8 matchesCount = _countMatches(t, r);
        euint64 rewardPoints = _rewardFromMatches(matchesCount);

        r.matchesCount = matchesCount;
        r.rewardPoints = rewardPoints;
        r.exists = true;

        _points[msg.sender] = FHE.add(_points[msg.sender], rewardPoints);

        FHE.allowThis(_points[msg.sender]);
        FHE.allow(_points[msg.sender], msg.sender);

        _allowResult(r, msg.sender);

        t.active = false;
        emit DrawCompleted(msg.sender);
    }

    function _normalizeDigit(euint8 digit) private returns (euint8) {
        return FHE.rem(digit, 10);
    }

    function _countMatches(Ticket storage t, DrawResult storage r) private returns (euint8) {
        euint8 zero = FHE.asEuint8(0);
        euint8 one = FHE.asEuint8(1);

        euint8 count = zero;
        count = FHE.add(count, FHE.select(FHE.eq(t.d0, r.w0), one, zero));
        count = FHE.add(count, FHE.select(FHE.eq(t.d1, r.w1), one, zero));
        count = FHE.add(count, FHE.select(FHE.eq(t.d2, r.w2), one, zero));
        count = FHE.add(count, FHE.select(FHE.eq(t.d3, r.w3), one, zero));
        count = FHE.add(count, FHE.select(FHE.eq(t.d4, r.w4), one, zero));
        count = FHE.add(count, FHE.select(FHE.eq(t.d5, r.w5), one, zero));

        return count;
    }

    function _rewardFromMatches(euint8 matchesCount) private returns (euint64) {
        euint64 reward = FHE.asEuint64(0);

        reward = FHE.select(FHE.eq(matchesCount, FHE.asEuint8(2)), FHE.asEuint64(100), reward);
        reward = FHE.select(FHE.eq(matchesCount, FHE.asEuint8(3)), FHE.asEuint64(200), reward);
        reward = FHE.select(FHE.eq(matchesCount, FHE.asEuint8(4)), FHE.asEuint64(2000), reward);
        reward = FHE.select(FHE.eq(matchesCount, FHE.asEuint8(5)), FHE.asEuint64(10000), reward);
        reward = FHE.select(FHE.eq(matchesCount, FHE.asEuint8(6)), FHE.asEuint64(100000), reward);

        return reward;
    }

    function _allowTicket(Ticket storage t, address user) private {
        FHE.allowThis(t.d0);
        FHE.allowThis(t.d1);
        FHE.allowThis(t.d2);
        FHE.allowThis(t.d3);
        FHE.allowThis(t.d4);
        FHE.allowThis(t.d5);

        FHE.allow(t.d0, user);
        FHE.allow(t.d1, user);
        FHE.allow(t.d2, user);
        FHE.allow(t.d3, user);
        FHE.allow(t.d4, user);
        FHE.allow(t.d5, user);
    }

    function _allowResult(DrawResult storage r, address user) private {
        FHE.allowThis(r.w0);
        FHE.allowThis(r.w1);
        FHE.allowThis(r.w2);
        FHE.allowThis(r.w3);
        FHE.allowThis(r.w4);
        FHE.allowThis(r.w5);
        FHE.allowThis(r.matchesCount);
        FHE.allowThis(r.rewardPoints);

        FHE.allow(r.w0, user);
        FHE.allow(r.w1, user);
        FHE.allow(r.w2, user);
        FHE.allow(r.w3, user);
        FHE.allow(r.w4, user);
        FHE.allow(r.w5, user);
        FHE.allow(r.matchesCount, user);
        FHE.allow(r.rewardPoints, user);
    }
}
