# Testing the New Architecture

## Architecture Overview

**Layer 1 - Entity Store** (`entityStore.js`)
- Stores only base matrices (S, K, etc.)
- Each matrix has independent dimensions
- Only stores painted cells (non-zero values with colors)
- No computation logic

**Layer 2 - View Layer** (`viewLayer.js`)
- Parses formula and creates view representations
- Handles transposes (S^T)
- Handles matrix duplicates (same matrix appearing multiple times)
- Read-only visualization

**Layer 3 - Computation Layer** (`computationLayer.js`)
- Builds dependency graph from entity store
- Computes matrix multiplications
- Tracks which base cells contribute to each output cell
- Completely separate from view

**Layer 4 - Output Matrix** (`OutputMatrix.svelte`)
- Displays computed results
- Shows dependencies on hover

## Testing Checklist

### Basic Workflow
1. ✓ Open http://localhost:5173/
2. ✓ You should see default matrices S and K (5x5 each)
3. ✓ Formula should be "S*K*S" by default
4. Paint some cells in matrix S (click to toggle cells with current color)
5. Paint some cells in matrix K
6. Change matrix dimensions using the spinners
7. Click "Compute" button
8. Check that output matrix O shows the result
9. Hover over cells in O to see dependencies highlighted in base matrices

### Formula Changes
1. Change formula to "S*S" 
2. Press Enter or click outside input
3. Matrices should update automatically
4. Try "S*K" - should work
5. Try "K*S" - should work
6. Try "S^T*K*S" - should work with transpose

### Save/Load
1. Paint some cells
2. Set custom dimensions for matrices
3. Click "Save" - should show success message
4. Refresh the page
5. Click "Load" - should restore everything exactly as it was

### Per-Matrix Dimensions
1. Change S to 3x4
2. Change K to 4x5  
3. Formula "S*K" should work (3x4 * 4x5 = 3x5)
4. Formula "K*S" should fail with dimension error

### Add New Matrix
1. Click "+ Add Matrix"
2. Enter a single letter (e.g., "A")
3. New matrix should appear
4. Use it in formula: "S*A*K"
5. Compute button should initialize and compute

## Expected Behavior

- **No auto-computation**: Only computes when you click Compute button
- **Clean separation**: Entity store → View → Computation → Output
- **Independent dimensions**: Each matrix can be any size
- **Dependency tracking**: Hover over output cells to see which base cells contribute
- **Save format v3**: Only saves base matrices with non-zero painted cells

## Known Limitations

- Maximum 20x20 matrix size (configurable in BaseMatrixEditor)
- Single letter matrix names only
- Formula must be valid at compute time (dimension compatibility checked)
