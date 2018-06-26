'use strict';
const Cryptomoji = require('./cryptomoji');

class Collection {
  constructor(owner){
    this.key = owner;
    this.moji = [];
  }
}

module.exports = Collection;
