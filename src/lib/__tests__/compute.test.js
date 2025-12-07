import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph, computeKS, computeO } from '../dependencyGraph.js';

function setupGraph(rows = 2, cols = 2) {
  const g = new DependencyGraph();
  g.initMatrix('S_left', rows, cols);
  g.initMatrix('S_right', rows, cols);
  g.initMatrix('K', cols, rows);
  g.initMatrix('KS', cols, cols);
  g.initMatrix('O', rows, rows);
  return g;
}

describe('computeKS and computeO', () => {
  let g;
  let k00; let s010; let ks01; let o01; let s000;

  beforeEach(() => {
    g = setupGraph(2, 2);
    k00 = g.getElementAt('K', 0, 0);
    s010 = g.getElementAt('S_right', 0, 1);
    ks01 = g.getElementAt('KS', 0, 1);
    o01 = g.getElementAt('O', 0, 1);
    s000 = g.getElementAt('S_left', 0, 0);

    // Seed base values
    g.updateElement('K', 0, 0, 1, '#f00');
    g.updateElement('S_right', 0, 1, 1, '#0f0');
    g.updateElement('S_left', 0, 0, 1, '#00f');
  });

  it('computes KS with dependencies from K and S_right', () => {
    computeKS(g, 2, 2);
    expect(ks01.value).toBe(1);
    // deps should include k00 and s010 ids
    expect(ks01.dependencies).toContain(k00.id);
    expect(ks01.dependencies).toContain(s010.id);
    // dependents should be wired bidirectionally
    expect(g.getNode(k00.id).dependents).toContain(ks01.id);
    expect(g.getNode(s010.id).dependents).toContain(ks01.id);
  });

  it('computes O including KS transitive dependencies', () => {
    computeKS(g, 2, 2);
    computeO(g, 2, 2);
    expect(o01.value).toBe(1);
    // O should depend on S_left directly and the KS dependencies (k00, s010)
    expect(o01.dependencies).toEqual(expect.arrayContaining([s000.id, k00.id, s010.id]));
    expect(o01.dependencies.length).toBe(3);
  });
});
