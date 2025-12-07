import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph, createElement, resetIdCounter } from '../dependencyGraph.js';

describe('DependencyGraph', () => {
  let graph;

  beforeEach(() => {
    resetIdCounter();
    graph = new DependencyGraph();
    graph.initMatrix('A', 2, 2);
    graph.initMatrix('B', 2, 2);
  });

  it('assigns unique ids to all nodes', () => {
    const ids = new Set();
    for (const [id] of graph.nodes) {
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
    expect(ids.size).toBe(8); // 2x2 + 2x2
  });

  it('adds bidirectional dependencies', () => {
    const a00 = graph.getElementAt('A', 0, 0).id;
    const b11 = graph.getElementAt('B', 1, 1).id;
    graph.addDependency(b11, a00);

    const target = graph.getNode(b11);
    const source = graph.getNode(a00);
    expect(target.dependencies).toContain(a00);
    expect(source.dependents).toContain(b11);
  });

  it('getAllDependencies returns transitive closure', () => {
    const a00 = graph.getElementAt('A', 0, 0).id;
    const a01 = graph.getElementAt('A', 0, 1).id;
    const b00 = graph.getElementAt('B', 0, 0).id;

    graph.addDependency(b00, a00);
    graph.addDependency(b00, a01);

    const deps = graph.getAllDependencies(b00);
    expect(deps.has(b00)).toBe(true);
    expect(deps.has(a00)).toBe(true);
    expect(deps.has(a01)).toBe(true);
    expect(deps.size).toBe(3);
  });
});
