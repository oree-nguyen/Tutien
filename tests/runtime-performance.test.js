import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPixelRatio } from '../src/runtime-performance.js';

test('lobby rendering uses the display pixel density while battle keeps its GPU budget', () => {
  assert.equal(renderPixelRatio(2.75, 'balanced', false), 2.75);
  assert.equal(renderPixelRatio(2.75, 'ultra', false), 2.75);
  assert.equal(renderPixelRatio(2.75, 'balanced', true), 1.25);
  assert.equal(renderPixelRatio(2.75, 'ultra', true), 1.5);
  assert.equal(renderPixelRatio(1, 'balanced', false), 1);
});
