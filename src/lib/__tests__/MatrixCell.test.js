import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import MatrixCell from '../MatrixCell.svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../stores.js', () => {
  const highlightedElements = writable(new Set());
  const highlightElement = vi.fn();
  const clearHighlights = vi.fn();
  return { highlightedElements, highlightElement, clearHighlights };
});

import { highlightElement, clearHighlights } from '../stores.js';

describe('MatrixCell', () => {
  let element;
  beforeEach(() => {
    element = {
      id: 'cell-1',
      row: 0,
      col: 0,
      value: 1,
      color: '#f00',
      dependencies: [],
      dependencyColors: ['#0f0']
    };
  });

  it('renders mini blocks when showMiniBlocks', () => {
    const { container } = render(MatrixCell, {
      props: { element, paintable: false, showMiniBlocks: true }
    });
    const minis = container.querySelectorAll('.mini');
    expect(minis.length).toBe(1);
    expect(minis[0].style.background).toBe('rgb(0, 255, 0)');
  });

  it('calls highlightElement on hover and clearHighlights on leave', async () => {
    const { container } = render(MatrixCell, {
      props: { element, paintable: false, showMiniBlocks: true }
    });
    const td = container.querySelector('td');
    await fireEvent.mouseOver(td);
    expect(highlightElement).toHaveBeenCalledWith('cell-1');
    await fireEvent.mouseLeave(td);
    expect(clearHighlights).toHaveBeenCalled();
  });
});
