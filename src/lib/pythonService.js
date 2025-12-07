/**
 * Python Interpreter Service using Pyodide
 * Manages Python execution and provides matrix tracking
 */

let pyodide = null;
let isLoading = false;
let isReady = false;

/**
 * Initialize Pyodide (loads Python runtime)
 */
export async function initPyodide() {
  if (isReady) return pyodide;
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return pyodide;
  }
  
  isLoading = true;
  
  try {
    const { loadPyodide } = await import('pyodide');
    // Use jsDelivr CDN for full pyodide distribution
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/'
    });
    
    // Install the custom matrix class
    await setupMatrixClass();
    
    isReady = true;
    return pyodide;
  } catch (error) {
    console.error('Failed to load Pyodide:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Setup custom TrackedMatrix class in Python
 */
async function setupMatrixClass() {
  await pyodide.runPythonAsync(`
class TrackedScalar:
  """Scalar value with dependency pairs (left/right sources)."""
  __slots__ = ("value", "deps")

  def __init__(self, value, deps=None):
    self.value = float(value)
    self.deps = deps if deps is not None else []  # list of {left, right}

  @staticmethod
  def base(matrix, row, col, value):
    return TrackedScalar(value, deps=[{"left": {"matrix": matrix, "row": row, "col": col}, "right": None}])

  def _flatten_sources(self):
    """Return list of simple source dicts (matrix,row,col)."""
    sources = []
    for p in self.deps:
      if p.get("left"):
        sources.append(p["left"])
      if p.get("right"):
        sources.append(p["right"])
    return sources or []

  def _pairs_for_mul(self, other):
    left_sources = self._flatten_sources() or [None]
    right_sources = other._flatten_sources() or [None]
    pairs = []
    for lsrc in left_sources:
      for rsrc in right_sources:
        pairs.append({"left": lsrc, "right": rsrc})
    return pairs

  # Arithmetic operations combine values and dependencies
  def __add__(self, other):
    if not isinstance(other, TrackedScalar):
      other = TrackedScalar(other)
    return TrackedScalar(self.value + other.value, deps=self.deps + other.deps)

  def __radd__(self, other):
    return self.__add__(other)

  def __sub__(self, other):
    if not isinstance(other, TrackedScalar):
      other = TrackedScalar(other)
    return TrackedScalar(self.value - other.value, deps=self.deps + other.deps)

  def __rsub__(self, other):
    if not isinstance(other, TrackedScalar):
      other = TrackedScalar(other)
    return TrackedScalar(other.value - self.value, deps=self.deps + other.deps)

  def __mul__(self, other):
    if not isinstance(other, TrackedScalar):
      other = TrackedScalar(other)
    deps = self._pairs_for_mul(other)
    return TrackedScalar(self.value * other.value, deps=deps)

  def __rmul__(self, other):
    return self.__mul__(other)

  def __truediv__(self, other):
    if not isinstance(other, TrackedScalar):
      other = TrackedScalar(other)
    deps = self._pairs_for_mul(other)
    return TrackedScalar(self.value / other.value, deps=deps)

  def __rtruediv__(self, other):
    if not isinstance(other, TrackedScalar):
      other = TrackedScalar(other)
    deps = self._pairs_for_mul(other)
    return TrackedScalar(other.value / self.value, deps=deps)

  def __float__(self):
    return float(self.value)

  def __repr__(self):
    return f"TrackedScalar({self.value}, deps={len(self.deps)})"


class RowProxy:
  """Provides K[i][j] returning tracked scalar."""
  __slots__ = ("matrix", "row")

  def __init__(self, matrix, row):
    self.matrix = matrix
    self.row = row

  def __getitem__(self, col):
    return self.matrix._get_tracked_scalar(self.row, col)


class TrackedMatrix:
    """
    A matrix that tracks dependencies during multiplication operations.
    Each cell knows which cells from the input matrices contributed to its value.
    """
    
    def __init__(self, data, name='Matrix', dependencies=None):
        """
        Initialize a TrackedMatrix.
        
        Args:
            data: 2D list/array of values
            name: Name of the matrix
            dependencies: 3D structure tracking dependencies per cell
        """
        if isinstance(data, list):
            self.data = [row[:] if isinstance(row, list) else list(row) for row in data]
        else:
            # Handle numpy arrays if available
            self.data = [[float(cell) for cell in row] for row in data]
        
        self.name = name
        self.rows = len(self.data)
        self.cols = len(self.data[0]) if self.rows > 0 else 0
        
        # Dependencies: [row][col] -> list of (matrix_name, row, col) tuples
        if dependencies is None:
            self.dependencies = [[[] for _ in range(self.cols)] for _ in range(self.rows)]
        else:
            self.dependencies = dependencies
    
    def _get_tracked_scalar(self, row, col):
      base_val = self.data[row][col]
      deps = self.dependencies[row][col]
      if deps:
        # Already has dependency pairs
        return TrackedScalar(base_val, deps=deps)
      # Base cell: create dependency pointing to this matrix cell
      return TrackedScalar.base(self.name, row, col, base_val)

    def __getitem__(self, key):
      # Return a row proxy so K[i][j] stays tracked
      if isinstance(key, int):
        return RowProxy(self, key)
      # Support tuple access K[i, j]
      if isinstance(key, tuple) and len(key) == 2:
        r, c = key
        return self._get_tracked_scalar(r, c)
      return self.data[key]
    
    def __repr__(self):
        lines = [f"TrackedMatrix('{self.name}', {self.rows}x{self.cols})"]
        for row in self.data:
            lines.append('  ' + str([f'{x:6.2f}' if x != 0 else '  0.00' for x in row]))
        return '\\n'.join(lines)
    
    def __matmul__(self, other):
      """
      Matrix multiplication with dependency tracking.
      Dependencies are flattened to base matrices so the UI can highlight
      original S_left, K, and S_right cells.
      """
      if not isinstance(other, TrackedMatrix):
        raise TypeError("Can only multiply TrackedMatrix with TrackedMatrix")
        
      if self.cols != other.rows:
        raise ValueError(f"Incompatible dimensions: {self.rows}x{self.cols} @ {other.rows}x{other.cols}")
        
      def flatten_sources(src_list):
        flat = []
        for s in src_list:
          if not isinstance(s, dict):
            continue
          if 'matrix' in s:
            flat.append(s)
          else:
            # Nested pair from previous multiplication
            if 'left' in s and isinstance(s['left'], dict):
              flat.extend(flatten_sources([s['left']]))
            if 'right' in s and isinstance(s['right'], dict):
              flat.extend(flatten_sources([s['right']]))
        return flat

      result_data = [[0.0 for _ in range(other.cols)] for _ in range(self.rows)]
      result_deps = [[[] for _ in range(other.cols)] for _ in range(self.rows)]
        
      for i in range(self.rows):
        for j in range(other.cols):
          total = 0.0
          deps = []
                
          for k in range(self.cols):
            left_val = self.data[i][k]
            right_val = other.data[k][j]
            if left_val == 0 or right_val == 0:
              continue

            total += left_val * right_val

            # Expand dependencies to base cells (flatten nested pairs)
            left_sources = flatten_sources(self.dependencies[i][k])
            right_sources = flatten_sources(other.dependencies[k][j])

            if not left_sources:
              left_sources = [{'matrix': self.name, 'row': i, 'col': k}]
            if not right_sources:
              right_sources = [{'matrix': other.name, 'row': k, 'col': j}]

            for lsrc in left_sources:
              for rsrc in right_sources:
                deps.append({
                  'left': lsrc,
                  'right': rsrc
                })
                
          result_data[i][j] = total
          result_deps[i][j] = deps
        
      result = TrackedMatrix(result_data, f"{self.name}*{other.name}", result_deps)
      return result
    
    def to_dict(self):
      """
      Convert to dictionary format for JavaScript.
      """
      return {
        'name': self.name,
        'rows': self.rows,
        'cols': self.cols,
        'data': self.data,
        'dependencies': self.dependencies
      }

    @staticmethod
    def from_nested(obj, name='O_py'):
      """Convert list-of-lists (with TrackedScalar or numbers) into TrackedMatrix."""
      if isinstance(obj, TrackedMatrix):
        return obj
      if not isinstance(obj, list):
        raise TypeError("O_py must be a TrackedMatrix or list of lists")
      rows = len(obj)
      cols = len(obj[0]) if rows > 0 else 0
      data = [[0.0 for _ in range(cols)] for _ in range(rows)]
      deps = [[[] for _ in range(cols)] for _ in range(rows)]
      for i in range(rows):
        for j in range(cols):
          cell = obj[i][j]
          if isinstance(cell, TrackedScalar):
            data[i][j] = float(cell.value)
            deps[i][j] = cell.deps or []
          elif isinstance(cell, (int, float)):
            data[i][j] = float(cell)
            deps[i][j] = []
          else:
            raise TypeError(f"Unsupported cell type at ({i},{j}): {type(cell)}")
      return TrackedMatrix(data, name, deps)

# Make it available globally
import sys
sys.modules['__main__'].TrackedMatrix = TrackedMatrix
`);
}

/**
 * Execute Python code with matrix inputs
 */
export async function executePython(code, matrices) {
  // Lazy-load Pyodide on first execution
  await ensurePyodideReady();
  
  const stdout = [];
  const stderr = [];
  const restoreStdout = pyodide.setStdout({ batched: (s) => stdout.push(s) });
  const restoreStderr = pyodide.setStderr({ batched: (s) => stderr.push(s) });

  try {
    // Convert matrices to Python TrackedMatrix objects
    const matrixSetup = `
S_left = TrackedMatrix(${JSON.stringify(matrices.S_left.data)}, 'S_left')
K = TrackedMatrix(${JSON.stringify(matrices.K.data)}, 'K')
S_right = TrackedMatrix(${JSON.stringify(matrices.S_right.data)}, 'S_right')
`;
    
    await pyodide.runPythonAsync(matrixSetup);
    
    // Execute user code
    const result = await pyodide.runPythonAsync(code);
    
    // Extract O_py as a plain JS object if present
    const oPyObj = await pyodide.runPythonAsync(`
  import js
  try:
    if 'O_py' in globals():
      if isinstance(O_py, TrackedMatrix):
        O_py_dict = O_py.to_dict()
      elif isinstance(O_py, list):
        O_py_converted = TrackedMatrix.from_nested(O_py, 'O_py')
        O_py_dict = O_py_converted.to_dict()
      else:
        O_py_dict = None
    else:
      O_py_dict = None
  except Exception:
    O_py_dict = None
  O_py_dict
  `);
    const oPyJs = (oPyObj && typeof oPyObj.toJs === 'function')
      ? oPyObj.toJs({ dict_converter: Object.fromEntries })
      : (oPyObj || null);
    
    return {
      success: true,
      output: result,
      O_py: oPyJs,
      stdout: stdout.join(''),
      stderr: stderr.join('')
    };
  } catch (error) {
    // Pyodide exceptions include the full traceback in error.message
    // The traceback will have format like:
    // Traceback (most recent call last):
    //   File "<stdin>", line 3, in <module>
    // NameError: name 'x' is not defined
    
    const errorMsg = error.message || String(error);
    
    // If stderr wasn't captured, use the error message as stderr
    // This ensures the traceback is available for error highlighting
    const capturedStderr = stderr.join('');
    const finalStderr = capturedStderr || errorMsg;
    
    return {
      success: false,
      error: errorMsg,
      output: null,
      O_py: null,
      stdout: stdout.join(''),
      stderr: finalStderr
    };
  } finally {
    if (restoreStdout) restoreStdout();
    if (restoreStderr) restoreStderr();
  }
}

/**
 * Check if Pyodide is ready
 */
export function isPyodideReady() {
  return isReady;
}

/**
 * Lazy-load Pyodide on first Python execution
 */
export async function ensurePyodideReady() {
  if (!isReady && !isLoading) {
    await initPyodide();
  }
  return pyodide;
}
