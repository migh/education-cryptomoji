'use strict';
const getPrng = require('../services/prng');
const { createHash } = require('crypto');

class Cryptomoji {
  constructor(owner, props = {}){
    this.owner = owner;
    this.dna = this.createDNA(props.index || 0, props.seed);
    this.breeder = props.breeder || null;
    this.sire = props.sire || null;
    this.breed = null;
    this.sired = null;
  }

  createDNA(index, seed) {
    const randomizer = getPrng(seed || this.owner);
    let i = index;
    let nonce;
    while(i-- > 0) nonce = randomizer(10000);
    return createHash('sha512').update(this.owner + nonce).digest('hex').slice(0,36);
  }
}

module.exports = Cryptomoji;
