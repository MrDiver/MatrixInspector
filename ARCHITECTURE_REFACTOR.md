# ARCHITECTURE REFACTORING SUMMARY

## What Was Wrong Before

The previous architecture had severe design flaws:
1. **Mixed concerns**: Entity data, view logic, and computation were all tangled in one "graph" store
2. **Reactive chaos**: Multiple subscriptions triggering each other, causing double/triple recomputes
3. **Global dimensions**: All matrices forced to have the same size
4. **Auto-computation issues**: Changes to stores automatically triggered recomputation in unpredictable ways
5. **Save/load broken**: Because the architecture was unclear, save/load couldn't properly restore state

## New Clean Architecture

### Layer 1: Entity Store (`entityStore.js`)
**Responsibility**: Store ONLY base matrices (user-paintable data)

- Each matrix is independent with its own dimensions
- Stores only non-zero painted cells (sparse representation)
- Pure data storage - no computation logic
- Simple CRUD operations: create, delete, setCell, getCell, etc.

```javascript
{
  name: 'S',
  rows: 5,
  cols: 5,
  cells: Map<"row,col", {value, color}>
}
```

### Layer 2: View Layer (`viewLayer.js`)
**Responsibility**: Create visual representations for formula display

- Parses formula into AST
- Creates view matrices for each term in the formula
- Handles transposes (S^T) by creating transposed view
- Handles duplicates (S appearing twice in formula)
- Read-only - no editing, no computation
- Validates dimension compatibility

```javascript
{
  id: 'S_0',
  baseName: 'S',
  displayName: 'S',
  isTransposed: false,
  rows: 5,
  cols: 5,
  getData: () => array  // reads from entity store
}
```

### Layer 3: Computation Layer (`computationLayer.js`)
**Responsibility**: Compute results and track dependencies

- Builds computation ONLY from entity store data
- Performs matrix multiplication with dependency tracking
- Completely separate from view layer
- Manual compute trigger (no auto-compute by default)
- Tracks which base cells contribute to each output cell

```javascript
outputMatrix = [
  [
    { value: 5, dependencies: Set(['S:0:0', 'K:0:1', ...]) },
    ...
  ]
]
```

### Layer 4: UI Components

**BaseMatrixEditor.svelte**
- Edit controls for base matrices
- Dimension spinners (per-matrix)
- Paint cells by clicking
- Clear and Delete buttons
- Shows highlighted dependencies

**FormulaViewMatrix.svelte**
- Read-only display
- Shows transposed versions correctly
- No edit controls
- Shows highlighted dependencies

**OutputMatrix.svelte**
- Displays computed result
- Hover to highlight dependencies
- Shows which base cells contribute

**App.svelte**
- Main layout with 2 rows:
  - Row 1: Base matrices with edit controls
  - Row 2: Formula view (read-only arrangement)
- Formula input with manual Compute button
- Save/Load buttons

## Key Design Decisions

### 1. Manual Computation (No Auto-Compute)
- User clicks "Compute" button explicitly
- Prevents reactive subscription chaos
- Clear, predictable behavior
- User controls when computation happens

### 2. Separation of Concerns
- Entity store knows nothing about views or computation
- View layer reads from entity store but doesn't modify it
- Computation layer reads from entity store, computes independently
- Each layer has a single, clear responsibility

### 3. Per-Matrix Dimensions
- Each base matrix has independent rows/cols
- More flexible than global dimensions
- Formula validation checks compatibility
- Can create rectangular matrices (3x5, 4x2, etc.)

### 4. Clean Save/Load (Version 3)
```json
{
  "version": 3,
  "formula": "S*K*S",
  "matrices": {
    "S": {
      "rows": 5,
      "cols": 5,
      "cells": [
        { "row": 0, "col": 1, "value": 1, "color": "#f093fb" }
      ]
    }
  }
}
```

- Only saves base matrices (not computed results)
- Only saves non-zero cells
- Saves per-matrix dimensions
- Loading: restore entity store, then user clicks Compute

### 5. Dependency Tracking
- Each output cell knows which base cells it depends on
- Hover over output cell → highlights dependencies in base matrices
- Uses string keys: `"matrixName:row:col"`
- Propagates through multiplication chain

## Data Flow

```
User Paints Cell
    ↓
Entity Store Updated (setCell)
    ↓
User Changes Formula
    ↓
View Layer Updates (creates view matrices)
    ↓
User Clicks "Compute"
    ↓
Computation Layer:
  - Reads from Entity Store
  - Evaluates formula AST
  - Performs matrix multiplications
  - Tracks dependencies
  - Updates Output Matrix
    ↓
UI Displays Result
```

## Files Created/Modified

### New Files
- `src/lib/entityStore.js` - Layer 1: Base matrix storage
- `src/lib/viewLayer.js` - Layer 2: Formula visualization
- `src/lib/computationLayer.js` - Layer 3: Computation & dependencies
- `src/lib/BaseMatrixEditor.svelte` - Editable matrix component
- `src/lib/FormulaViewMatrix.svelte` - Read-only view component
- `src/lib/OutputMatrix.svelte` - Result display component
- `src/lib/SimpleColorPicker.svelte` - Color selection component
- `src/lib/constants.js` - Shared constants
- `TESTING_NEW_ARCH.md` - Testing guide

### Modified Files
- `src/App.svelte` - Complete rewrite using new architecture
  - Old version backed up to `App_OLD.svelte`

### Preserved Files
- `src/lib/formulaParser.js` - Still used for parsing formulas
- `src/lib/dependencyGraph.js` - Not used anymore but kept for reference

## Testing the New System

1. **Open** http://localhost:5173/
2. **Paint cells** in S and K matrices (click to toggle)
3. **Change dimensions** using spinners (try making S 3x4, K 4x5)
4. **Click Compute** to see result
5. **Hover over output cells** to see dependency highlighting
6. **Change formula** (e.g., "S*K", "K*S", "S^T*K*S")
7. **Save** your work
8. **Refresh page** and **Load** - everything should restore perfectly

## Benefits of New Architecture

✅ **Clear separation of concerns** - each layer has one job
✅ **No reactive chaos** - manual compute button prevents loops  
✅ **Per-matrix dimensions** - each matrix can be any size
✅ **Save/Load works perfectly** - clean data model
✅ **Dependency tracking** - see which cells contribute to results
✅ **Predictable behavior** - user controls when things happen
✅ **Easy to understand** - data flows in one direction
✅ **Easy to extend** - add new features by extending layers
✅ **Testable** - each layer can be tested independently

## Migration from Old Architecture

The old architecture mixed everything together in one "DependencyGraph" class:
- Had matrices, CSR representations, computed results all in one object
- Used Svelte store with automatic subscriptions
- Global dimensions
- Auto-computation on any change
- Complex state management

The new architecture cleanly separates:
- **Data** (entity store)
- **View** (how to display it)
- **Computation** (how to calculate it)
- **UI** (how user interacts)

This follows proper software engineering principles and makes the codebase maintainable.

## Next Steps (Future Enhancements)

1. **Add CSR view** - can read from output matrix
2. **Add Python integration** - import/export computed results
3. **Add undo/redo** - easy with entity store architecture
4. **Add matrix operations** - fill diagonal, random generation, etc.
5. **Add export formats** - CSV, JSON, LaTeX, etc.
6. **Add visualization** - graph view of dependencies
7. **Add validation** - check formula before compute
8. **Add themes** - dark mode support

All of these are now easy to add because the architecture is clean and modular!
