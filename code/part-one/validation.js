'use strict';

const { createHash } = require('crypto');
const signing = require('./signing');

/**
 * A simple validation function for transactions. Accepts a transaction
 * and returns true or false. It should reject transactions that:
 *   - have negative amounts
 *   - were improperly signed
 *   - have been modified since signing
 */
const isValidTransaction = transaction => {
  if (transaction.amount < 0) return false;
  return signing.verify(transaction.source, transaction.source + transaction.recipient + transaction.amount, transaction.signature);
};

/**
 * Validation function for blocks. Accepts a block and returns true or false.
 * It should reject blocks if:
 *   - their hash or any other properties were altered
 *   - they contain any invalid transactions
 */
const isValidBlock = block => {
  const transactionValidity = !block.transactions.map( txn => isValidTransaction(txn)).includes(false);
  const blockValidity = (block.verifyHash() === block.hash);
  return transactionValidity && blockValidity;
};

/**
 * One more validation function. Accepts a blockchain, and returns true
 * or false. It should reject any blockchain that:
 *   - is a missing genesis block
 *   - has any block besides genesis with a null hash
 *   - has any block besides genesis with a previousHash that does not match
 *     the previous hash
 *   - contains any invalid blocks
 *   - contains any invalid transactions
 */
const isValidChain = blockchain => {
  const genesis = blockchain.blocks[0];
  const tail = blockchain.blocks.slice(1);
  const hashes = blockchain.blocks.map( block => block.hash );
  const pHashes = blockchain.blocks.map( block => block.previousHash );
  const notNullHash = !hashes.includes(null);
  const validBlocks = !blockchain.blocks.map( block => isValidBlock(block)).includes(false);

  if (genesis.previousHash !== null || genesis.transactions.length !== 0) return false;

  const matchingHashes = !hashes.slice(0, hashes.length-1)
    .map( (hash, index) => (hash === pHashes[index + 1])).includes(false);

  return notNullHash && validBlocks && matchingHashes;
};

/**
 * This last one is just for fun. Become a hacker and tamper with the passed in
 * blockchain, mutating it for your own nefarious purposes. This should
 * (in theory) make the blockchain fail later validation checks;
 */
const breakChain = blockchain => {
  const myKey = signing.getPublicKey(signing.createPrivateKey());
  blockchain.blocks.map( block => {
    block.nonce = Math.floor( Math.random() * 10000 % 558);
    block.transactions.map( txn => {
      txn.recipient = myKey;
    });
  });
};

module.exports = {
  isValidTransaction,
  isValidBlock,
  isValidChain,
  breakChain
};
