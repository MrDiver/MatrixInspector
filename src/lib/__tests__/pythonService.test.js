import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRun, mockPyInstance, mockLoadPyodide } = vi.hoisted(() => {
  const mockRun = vi.fn(async (code) => {
    if (code.includes('class TrackedMatrix')) return null; // setup
    if (code.startsWith('\nS_left = TrackedMatrix')) return null; // matrixSetup
    if (code.includes('O_py_dict')) {
      return {
        toJs: ({ dict_converter }) => dict_converter ? { data: [[1]], dependencies: [[[]]] } : { data: [[1]] }
      };
    }
    return 'ok';
  });

  const mockPyInstance = {
    runPythonAsync: (code) => mockRun(code),
    setStdout: () => () => {},
    setStderr: () => () => {}
  };

  const mockLoadPyodide = vi.fn(async () => mockPyInstance);

  return { mockRun, mockPyInstance, mockLoadPyodide };
});

vi.mock('pyodide', () => ({
  loadPyodide: mockLoadPyodide
}));

import { executePython, initPyodide, isPyodideReady } from '../pythonService.js';

const matrices = {
  S_left: { data: [[1]], rows: 1, cols: 1 },
  K: { data: [[1]], rows: 1, cols: 1 },
  S_right: { data: [[1]], rows: 1, cols: 1 }
};

describe('pythonService executePython', () => {
  beforeEach(async () => {
    mockRun.mockReset();
    mockRun.mockImplementation(async (code) => {
      if (code.includes('class TrackedMatrix')) return null;
      if (code.startsWith('\nS_left = TrackedMatrix')) return null;
      if (code.includes('O_py_dict')) {
        return {
          toJs: ({ dict_converter }) => dict_converter ? { data: [[1]], dependencies: [[[]]] } : { data: [[1]] }
        };
      }
      return 'ok';
    });
    // ensure pyodide is initialized fresh
    await initPyodide();
  });

  it('returns success with O_py conversion', async () => {
    const res = await executePython('print("hi")', matrices);
    expect(res.success).toBe(true);
    expect(res.O_py).toBeTruthy();
    expect(res.O_py.data[0][0]).toBe(1);
  });

  it('captures error message into stderr when runPythonAsync throws', async () => {
    const err = new Error('Traceback...\n  File "<stdin>", line 2\nNameError: oops');
    mockRun.mockImplementation(async (code) => {
      if (code.includes('class TrackedMatrix')) return null;
      if (code.startsWith('\nS_left = TrackedMatrix')) return null;
      if (code.includes('O_py_dict')) return null;
      if (code === 'badcode') throw err;
      return 'ok';
    });
    const result = await executePython('badcode', matrices);
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('NameError');
  });

  it('returns raw list when O_py is plain nested list', async () => {
    mockRun.mockImplementation(async (code) => {
      if (code.includes('class TrackedMatrix')) return null;
      if (code.startsWith('\nS_left = TrackedMatrix')) return null;
      if (code.includes('O_py_dict')) return /** @type {any} */ ([[2]]); // already JSON-serializable
      return 'ok';
    });

    const res = await executePython('code', matrices);
    expect(res.success).toBe(true);
    expect(res.O_py).toEqual([[2]]);
  });

  it('initPyodide marks readiness and avoids double load', async () => {
    await initPyodide();
    expect(isPyodideReady()).toBe(true);
    await initPyodide();
    expect(mockLoadPyodide).toHaveBeenCalledTimes(1);
  });
});
