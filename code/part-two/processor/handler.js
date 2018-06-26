'use strict';

const Promise = require('bluebird');
const { TransactionHandler } = require('sawtooth-sdk/processor/handler');
const { InvalidTransaction } = require('sawtooth-sdk/processor/exceptions');
const { decode } = require('./services/encoding');
const { getCollectionAddress, getMojiAddress, getSireAddress } = require('./services/addressing');
const { Collection, Cryptomoji, Sire } = require('./models');

const FAMILY_NAME = 'cryptomoji';
const FAMILY_VERSION = '0.1';
const NAMESPACE = '5f4d76';
const ACTIONS = {
  'CREATE_COLLECTION': createCollection,
  'SELECT_SIRE': selectSire,
  'BREED_MOJI': breedMoji
};
const ERROR = {
  UNKNOWN_ERROR: 'Unknown error.',
  UNKNOWN_ACTION: 'The action is not recognized',
  POORLY_ENCODED: 'The payload was poorly encoded.',
  ADDRESS_ALREADY_USED: 'The user already have a collection.'
};
/**
 * A Cryptomoji specific version of a Hyperledger Sawtooth Transaction Handler.
 */
class MojiHandler extends TransactionHandler {
  /**
   * The constructor for a TransactionHandler simply registers it with the
   * validator, declaring which family name, versions, and namespaces it
   * expects to handle. We'll fill this one in for you.
   */
  constructor () {
    console.log('Initializing cryptomoji handler with namespace:', NAMESPACE);
    super(FAMILY_NAME, [ FAMILY_VERSION ], [ NAMESPACE ]);
  }

  /**
   * The apply method is where the vast majority of all the work of a
   * transaction processor happens. It will be called once for every
   * transaction, passing two objects: a transaction process request ("txn" for
   * short) and state context.
   *
   * Properties of `txn`:
   *   - txn.payload: the encoded payload sent from your client
   *   - txn.header: the decoded TransactionHeader for this transaction
   *   - txn.signature: the hex signature of the header
   *
   * Methods of `context`:
   *   - context.getState(addresses): takes an array of addresses and returns
   *     a Promise which will resolve with the requested state. The state
   *     object will have keys which are addresses, and values that are encoded
   *     state resources.
   *   - context.setState(updates): takes an update object and returns a
   *     Promise which will resolve with an array of the successfully
   *     updated addresses. The updates object should have keys which are
   *     addresses, and values which are encoded state resources.
   *   - context.deleteState(addresses): deletes the state for the passed
   *     array of state addresses. Only needed if attempting the extra credit.
   */
  apply (txn, context) {
    try {
      const payload = JSON.parse( txn.payload.toString() );
      if ( ACTIONS[payload.action] ) {
        return ACTIONS[payload.action](txn, context);
      } else throw new InvalidTransaction(ERROR.UNKNOWN_ACTION);

    } catch(err) {
      if (err instanceof SyntaxError) {
        throw new InvalidTransaction(ERROR.POORLY_ENCODED);
      } else {
        throw err;
      }
    }
  }
}

function createCollection(txn, ctx) {
  const owner = txn.header.signerPublicKey;
  const collectionAddr = getCollectionAddress(owner);

  return ctx.getState([collectionAddr]).then( state => {
    if (state[collectionAddr].length > 0) {
      throw new InvalidTransaction(ERROR.ADDRESS_ALREADY_USED);
    }

    const mojis = new Array(3).fill(null).map( (_,i) => (new Cryptomoji(owner, {index: i, seed: txn.signature })) );
    const mojiAddresses = new Array(3).fill(null).map( (_,i) => getMojiAddress(owner, mojis[i].dna) );
    return ctx.setState( mojiAddresses.reduce( (acc, mojiAddress, i ) => {
      acc[mojiAddress] = JSON.stringify(mojis[i]);
      return acc;
    }, {}) );
  })
  .then( mojiAddresses => {
    const collection = new Collection(owner);
    collection.moji = mojiAddresses;
    return ctx.setState(
      { [collectionAddr]: JSON.stringify(collection) }
    );
  })
  .catch( err => {
    throw err;
  });
}

function selectSire(txn, ctx) {
  return Promise.resolve('ss');
}

function breedMoji(txn, ctx) {
  return Promise.resolve('bm');
}

module.exports = MojiHandler;
