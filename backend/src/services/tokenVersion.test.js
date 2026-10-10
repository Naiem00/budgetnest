import test from 'node:test'
import assert from 'node:assert/strict'
import {tokenVersionMatches} from './tokenVersion.js'
test('existing tokens survive migration but not a password rotation',()=>{
  assert.equal(tokenVersionMatches(undefined,0),true)
  assert.equal(tokenVersionMatches(undefined,1),false)
  assert.equal(tokenVersionMatches(0,1),false)
  assert.equal(tokenVersionMatches(2,2),true)
  assert.equal(tokenVersionMatches('2',2),false)
})
