import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph, computeKS, computeO } from '../dependencyGraph.js';

function makeGraph(rows = 3, cols = 3) {
  const g = new DependencyGraph();
  g.initMatrix('S_left', rows, cols);
  g.initMatrix('S_right', rows, cols);
  g.initMatrix('K', cols, rows);
  g.initMatrix('KS', cols, cols);
  g.initMatrix('O', rows, rows);
  return g;
}

describe('dependencyGraph CSR & edge cases', () => {
  let g;
  beforeEach(() => {
    g = makeGraph(2, 2);
  });

  it('getCSRWithIds returns correct row offsets and indices', () => {
    // paint K[0][1] and K[1][0]
    g.updateElement('K', 0, 1, 1, '#a');
    g.updateElement('K', 1, 0, 1, '#b');
    const csr = g.getCSRWithIds('K');
    expect(csr.row_offsets).toEqual([0, 1, 2]);
    expect(csr.col_indices).toEqual([1, 0]);
    expect(csr.elementIds).toHaveLength(2);
  });

  it('computeKS sets zero when no contributors', () => {
    computeKS(g, 2, 2);
    const ks00 = g.getElementAt('KS', 0, 0);
    expect(ks00.value).toBe(0);
    expect(ks00.dependencies).toHaveLength(0);
  });

  it('computeO dedupes contributors', () => {
    // Make duplicated contributors across t
    g.updateElement('S_left', 0, 0, 1, '#1');
    g.updateElement('S_left', 0, 1, 1, '#1');
    g.updateElement('KS', 0, 0, 1, '#2');
    g.getElementAt('KS', 0, 0).dependencies = ['depA'];
    g.updateElement('KS', 1, 0, 1, '#3');
    g.getElementAt('KS', 1, 0).dependencies = ['depA']; // duplicate dep

    computeO(g, 2, 2);
    const o00 = g.getElementAt('O', 0, 0);
    // Should contain S_left[0,0], S_left[0,1] and unique depA
    expect(o00.dependencies.sort()).toEqual(['depA', g.getElementAt('S_left', 0, 0).id, g.getElementAt('S_left', 0, 1).id].sort());
  });

  it('clearMatrixDependencies drops links in both directions', () => {
    const ks = g.getElementAt('KS', 0, 0);
    const k00 = g.getElementAt('K', 0, 0);
    ks.dependencies = [k00.id];
    k00.dependents = [ks.id];

    g.clearMatrixDependencies('KS');
    expect(ks.dependencies).toHaveLength(0);
    expect(k00.dependents).not.toContain(ks.id);
  });

  it('getCSRWithIds returns null for missing matrix', () => {
    expect(g.getCSRWithIds('NOPE')).toBeNull();
  });

  it('getAllDependents walks transitive closure', () => {
    const a = g.getElementAt('S_left', 0, 0).id;
    const b = g.getElementAt('KS', 0, 0).id;
    const c = g.getElementAt('O', 0, 0).id;
    g.addDependency(b, a);
    g.addDependency(c, b);
    const deps = g.getAllDependents(a);
    expect(deps.has(a)).toBe(true);
    expect(deps.has(b)).toBe(true);
    expect(deps.has(c)).toBe(true);
  });
});
