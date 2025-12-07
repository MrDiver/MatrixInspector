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
    
    def __getitem__(self, key):
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

# Make it available globally
import sys
sys.modules['__main__'].TrackedMatrix = TrackedMatrix
`);
}

/**
 * Execute Python code with matrix inputs
 */
export async function executePython(code, matrices) {
  if (!isReady) {
    await initPyodide();
  }
  
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
    O_py_dict = O_py.to_dict() if 'O_py' in globals() else None
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
    return {
      success: false,
      error: error.message,
      output: null,
      O_py: null,
      stdout: stdout.join(''),
      stderr: stderr.join('')
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
