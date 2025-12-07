import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  graph as graphStore,
  rows,
  cols,
  mirrorS,
  symmetric,
  highlightedElements,
  initializeMatrices,
  toggleElement,
  recomputeAll,
  highlightElement,
  clearHighlights
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

describe('stores integration', () => {
  beforeEach(() => {
    resetStores();
  });

  it('initializeMatrices sets dimensions and creates matrices', () => {
    initializeMatrices(3, 4, true, false);
    expect(get(rows)).toBe(3);
    expect(get(cols)).toBe(4);
    const g = get(graphStore);
    expect(g.matrices['S_left'].length).toBe(3);
    expect(g.matrices['S_left'][0].length).toBe(4);
    expect(g.matrices['O'].length).toBe(3);
    expect(g.matrices['O'][0].length).toBe(3);
  });

  it('toggleElement mirrors to S_right when mirror is on', () => {
    initializeMatrices(2, 2, true, false);
    toggleElement('S_left', 0, 1, '#abc');
    const g = get(graphStore);
    const left = g.getElementAt('S_left', 0, 1);
    const right = g.getElementAt('S_right', 0, 1);
    expect(left.value).toBe(1);
    expect(right.value).toBe(1);
    expect(right.color).toBe('#abc');
  });

  it('toggleElement applies symmetry when enabled', () => {
    initializeMatrices(2, 2, false, false);
    symmetric.set(true);
    toggleElement('S_left', 0, 1, '#def');
    const g = get(graphStore);
    expect(g.getElementAt('S_left', 1, 0).value).toBe(1);
    expect(g.getElementAt('S_left', 1, 0).color).toBe('#def');
  });

  it('highlightElement marks dependencies from O cell', () => {
    initializeMatrices(2, 2, false, false);
    mirrorS.set(false);
    const g = get(graphStore);
    // Seed base cells
    g.updateElement('S_left', 0, 0, 1, '#1');
    g.updateElement('K', 0, 0, 1, '#2');
    g.updateElement('S_right', 0, 0, 1, '#3');
    graphStore.set(g);

    recomputeAll();
    const o00 = get(graphStore).getElementAt('O', 0, 0).id;
    highlightElement(o00);
    const highlights = get(highlightedElements);
    expect(highlights.has(o00)).toBe(true);
    // Should include all three base contributors
    const g2 = get(graphStore);
    const sId = g2.getElementAt('S_left', 0, 0).id;
    const kId = g2.getElementAt('K', 0, 0).id;
    const rId = g2.getElementAt('S_right', 0, 0).id;
    expect(highlights.has(sId)).toBe(true);
    expect(highlights.has(kId)).toBe(true);
    expect(highlights.has(rId)).toBe(true);
  });
});
