'use strict';
const getPrng = require('../services/prng');
const { createHash } = require('crypto');

class Cryptomoji {
  constructor(owner, props = {}){
    this.owner = owner;
    this.dna = (props.breeder && props.sire) ? this. recombineDNA(props.sire.dna, props.breeder.dna) : this.createDNA(props.index || 0, props.seed);
    this.breeder = ( props.breeder && props.breeder.address ) || null;
    this.sire = ( props.sire && props.sire.address ) || null;
    this.bred = [];
    this.sired = [];
  }

  createDNA(index, seed) {
    const randomizer = getPrng(seed || this.owner);
    let i = index;
    let nonce;
    while(i-- > 0) nonce = randomizer(10000);
    return createHash('sha512').update(this.owner + nonce).digest('hex').slice(0,36);
  }

  recombineDNA(sire, breeder) {
    let child = '';
    let i = sire.length / 2;
    while (i-- > 0) {
      child += sire[i] + breeder[i];
    }
    return child;
  }
}

module.exports = Cryptomoji;
