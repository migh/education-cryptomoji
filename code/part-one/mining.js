'use strict';

const { createHash } = require('crypto');
const signing = require('./signing');
const { Block, Blockchain } = require('./blockchain');


/**
 * A slightly modified version of a transaction. It should work mostly the
 * the same as the non-mineable version, but now recipient is optional,
 * allowing the creation of transactions that will reward miners by creating
 * new funds for their balances.
 */
class MineableTransaction {
  /**
   * If recipient is omitted, this is a reward transaction. The _source_ should
   * then be set to `null`, while the _recipient_ becomes the public key of the
   * signer.
   */
  constructor(privateKey, recipient = null, amount) {
    this.source = (recipient) ? signing.getPublicKey(privateKey) : null; 
    this.recipient = recipient || signing.getPublicKey(privateKey);
    this.amount = amount;
    this.signature = signing.sign(privateKey, '' + this.source + recipient + amount);
  }
}

/**
 * Almost identical to the non-mineable block. In fact, we'll extend it
 * so we can reuse the calculateHash method.
 */
class MineableBlock extends Block {
  /**
   * Unlike the non-mineable block, when this one is initialized, we want the
   * hash and nonce to not be set. This Block starts invalid, and will
   * become valid after it is mined.
   */
  constructor(transactions, previousHash) {
    super(transactions, previousHash);
    delete this.nonce;
    delete this.hash; 
  }
}

/**
 * The new mineable chain is a major update to our old Blockchain. We'll
 * extend it so we can use some of its methods, but it's going to look
 * very different when we're done.
 */
class MineableChain extends Blockchain {
  /**
   * In addition to initializing a blocks array with a genesis block, this will
   * create hard-coded difficulty and reward properties. These are settings
   * which will be used by the mining method.
   *
   * Properties:
   *   - blocks: an array of mineable blocks
   *   - difficulty: a number, how many hex digits must be zeroed out for a
   *     hash to be valid, this will increase mining time exponentially, so
   *     probably best to set it pretty low (like 2 or 3)
   *   - reward: a number, how much to award the miner of each new block
   *
   * Hint:
   *   You'll also need some sort of property to store pending transactions.
   *   This will only be used internally.
   */
  constructor() {
    super();
    this.difficulty = 2;
    this.reward = 5;
    this.pendingTransactions = [];
  }

  /**
   * No more adding blocks directly.
   */
  addBlock() {
    throw new Error('Must mine to add blocks to this blockchain');
  }

  /**
   * Instead of blocks, we add pending transactions. This method should take a
   * mineable transaction and simply store it until it can be mined.
   */
  addTransaction(transaction) {
    this.pendingTransactions.push(transaction);
  }

  /**
   * This method takes a private key, and uses it to create a new transaction
   * rewarding the owner of the key. This transaction should be combined with
   * the pending transactions and included in a new block on the chain.
   *
   * Note:
   *   Only certain hashes are valid for blocks now! In order for a block to be
   *   valid it must have a hash that starts with as many zeros as the
   *   the blockchain's difficulty. You'll have to keep trying nonces until you
   *   find one that works!
   *
   * Hint:
   *   Don't forget to clear your pending transactions after you're done.
   */
  mine(privateKey) {
    const rewardTransaction = new MineableTransaction(privateKey, null, this.reward);
    this.pendingTransactions.push(rewardTransaction);
    const newBlock = new MineableBlock(this.pendingTransactions, this.getHeadBlock().hash);
    this.pendingTransactions = [];

    let i = 0;
    while ( !(newBlock.hash && leadingZeros(newBlock.hash, this.difficulty)) ) {
      newBlock.calculateHash(i++);
    }
    this.blocks.push(newBlock);
  }
}

/**
 * A new validation function for our mineable blockchains. Forget about all the
 * signature and hash validation we did before. Our old validation functions
 * may not work right, but rewriting them would be a very dull experience.
 *
 * Instead, this function will make a few brand new checks. It should reject
 * a blockchain with:
 *   - any hash other than genesis's that doesn't start with the right
 *     number of zeros
 *   - any block that has more than one transaction with a null source
 *   - any transaction with a null source that has an amount different
 *     than the reward
 *   - any public key that ever goes into a negative balance by sending
 *     funds they don't have
 */
const isValidMineableChain = blockchain => {
  const validHashes = !blockchain.blocks.slice(1).map( block => leadingZeros(block.hash, blockchain.difficulty) ).includes(false);
  const oneRewardPerBlock = !blockchain.blocks.map( block => {
    return block.transactions.filter( txn => (txn.source === null) ).length > 1;
  }).includes(true);
  const notTamperedReward = blockchain.blocks
    .map( block => block.transactions.filter( txn => (txn.source === null && txn.amount !== blockchain.reward) ) )
    .filter( res => (res.length !== 0) ).length === 0;
  const enoughFunds = blockchain.blocks.map( block => block.transactions )
      .reduce( (acc, blckTnxs) => (acc.concat(blckTnxs)), [])
      .reduce( (state, txn) => {
        if (!state.isValid) return state;

        if (txn.source) {
          if (state[txn.source] && (state[txn.source] >= txn.amount)) {
            state[txn.source] -= txn.amount;
          } else {
            if (txn.amount === 0){
              state[txn.source] = txn.amount;
            } else {
	      state.isValid = false;
            }
          }
        }

        if (state.isValid) state[txn.recipient] += txn.amount;
        return state;

      }, { isValid: true });

  return validHashes && oneRewardPerBlock && notTamperedReward && enoughFunds.isValid;
};

function leadingZeros(str, len) {
  return '0'.repeat(len) === str.slice(0, len);
}

module.exports = {
  MineableTransaction,
  MineableBlock,
  MineableChain,
  isValidMineableChain
};
