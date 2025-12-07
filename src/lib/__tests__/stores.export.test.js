import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  graph as graphStore,
  rows,
  cols,
  mirrorS,
  symmetric,
  initializeMatrices,
  exportMatrices,
  importMatrices,
  getCSRData
} from '../stores.js';
import { DependencyGraph } from '../dependencyGraph.js';

function resetStores() {
  graphStore.set(new DependencyGraph());
  rows.set(2);
  cols.set(2);
  mirrorS.set(false);
  symmetric.set(false);
}

describe('stores export/import/CSR', () => {
  beforeEach(() => {
    resetStores();
    initializeMatrices(2, 2, false, false);
  });

  it('exportMatrices captures values, colors, dims, config', () => {
    const g = get(graphStore);
    g.updateElement('S_left', 0, 1, 1, '#abc');
    g.updateElement('K', 1, 0, 1, '#def');
    graphStore.set(g);

    const json = exportMatrices();
    expect(json.version).toBe(1);
    expect(json.dimensions).toEqual({ rows: 2, cols: 2 });
    expect(json.configuration).toEqual({ symmetric: false, mirror: false });
    expect(json.matrices.S_left).toEqual([
      { row: 0, col: 1, value: 1, color: '#abc' }
    ]);
    expect(json.matrices.K).toEqual([
      { row: 1, col: 0, value: 1, color: '#def' }
    ]);
  });

  it('importMatrices restores graph shape and values', () => {
    const data = {
      version: 1,
      timestamp: '2024-01-01T00:00:00.000Z',
      dimensions: { rows: 3, cols: 2 },
      configuration: { symmetric: true, mirror: true },
      matrices: {
        S_left: [{ row: 0, col: 0, value: 1, color: '#1' }],
        S_right: [{ row: 2, col: 1, value: 1, color: '#2' }],
        K: [{ row: 1, col: 0, value: 1, color: '#3' }],
        O: [],
        KS: []
      }
    };

    const ok = importMatrices(data);
    expect(ok).toBe(true);
    expect(get(rows)).toBe(3);
    expect(get(cols)).toBe(2);
    expect(get(symmetric)).toBe(true);
    expect(get(mirrorS)).toBe(true);

    const g = get(graphStore);
    expect(g.getElementAt('S_left', 0, 0).value).toBe(1);
    expect(g.getElementAt('S_left', 0, 0).color).toBe('#1');
    expect(g.getElementAt('S_right', 2, 1).value).toBe(1);
    expect(g.getElementAt('K', 1, 0).value).toBe(1);
  });

  it('getCSRData returns own color list for nonzero entries', async () => {
    const g = get(graphStore);
    g.updateElement('S_left', 0, 0, 1, '#abc');
    graphStore.set(g);

    const csrStore = getCSRData('S_left');
    await new Promise((resolve) => {
      csrStore.subscribe((val) => {
        if (!val) return;
        expect(val.row_offsets.length).toBe(3); // rows + 1 for 2x2
        expect(val.col_indices).toEqual([0]);
        expect(val.values[0]).toEqual(['#abc']);
        resolve();
      });
    });
  });
});
