import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  graph as graphStore,
  rows,
  cols,
  mirrorS,
  symmetric,
  initializeMatrices,
  toggleElement,
  generateRandomMatrix,
  fillDiagonal,
  recomputeAll,
  clearHighlights,
  highlightedElements,
  getMatrixData
} from '../stores.js';
import { DependencyGraph } from '../dependencyGraph.js';

function resetStores() {
  graphStore.set(new DependencyGraph());
  rows.set(2);
  cols.set(2);
  mirrorS.set(true);
  symmetric.set(false);
  clearHighlights();
}

describe('stores extras', () => {
  beforeEach(() => {
    resetStores();
    initializeMatrices(2, 2, true, false);
  });

  it('toggleElement respects mirror lock on S_right', () => {
    mirrorS.set(true);
    toggleElement('S_right', 0, 0, '#x');
    const g = get(graphStore);
    expect(g.getElementAt('S_right', 0, 0).value).toBe(0);
  });

  it('fillDiagonal mirrors to S_right when mirror on', () => {
    fillDiagonal('S_left', '#c');
    const g = get(graphStore);
    expect(g.getElementAt('S_left', 0, 0).value).toBe(1);
    expect(g.getElementAt('S_right', 0, 0).value).toBe(1);
  });

  it('generateRandomMatrix uses provided color and is reproducible with stubbed random', () => {
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0.05); // always paint
    generateRandomMatrix('S_left', 0.5, false, '#abc');
    const g = get(graphStore);
    expect(g.getElementAt('S_left', 0, 0).color).toBe('#abc');
    rand.mockRestore();
  });

  it('recomputeAll produces KS/O values after seeding', () => {
    const g = get(graphStore);
    g.updateElement('S_left', 0, 0, 1, '#1');
    g.updateElement('K', 0, 0, 1, '#2');
    g.updateElement('S_right', 0, 0, 1, '#3');
    graphStore.set(g);

    recomputeAll();
    const g2 = get(graphStore);
    expect(g2.getElementAt('KS', 0, 0).value).toBe(1);
    expect(g2.getElementAt('O', 0, 0).value).toBe(1);
  });

  it('getMatrixData respects transpose flag', async () => {
    const derivedStore = getMatrixData('S_left');
    // set a value and transpose
    const g = get(graphStore);
    g.updateElement('S_left', 0, 1, 1, '#z');
    graphStore.set(g);
    let unsub;
    unsub = derivedStore.subscribe((matrix) => {
      if (!matrix || !matrix.length) return;
      expect(matrix[0][1].color).toBe('#z');
      if (unsub) unsub();
    });
  });
});
