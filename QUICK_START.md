# Quick Start Guide

## Project Structure

```
matrix-inspector-svelte/
├── src/
│   ├── lib/
│   │   ├── dependencyGraph.js    # Core graph system with unique IDs
│   │   ├── stores.js              # Svelte stores for state management
│   │   ├── MatrixCell.svelte      # Individual matrix cell component
│   │   ├── MatrixView.svelte      # Matrix grid view
│   │   ├── CSRValue.svelte        # CSR value element
│   │   ├── CSRView.svelte         # CSR representation
│   │   └── ColorPicker.svelte     # Color selection UI
│   ├── App.svelte                 # Main application component
│   ├── app.css                    # Global styles
│   └── main.js                    # Entry point
├── public/                        # Static assets
├── README.md                      # Full documentation
├── REFACTORING_SUMMARY.md         # Refactoring details
└── package.json                   # Dependencies

```

## Installation & Running

```bash
# Navigate to project
cd matrix-inspector-svelte

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## How It Works

### 1. Dependency Graph System

Every matrix element gets a unique ID:
- `elem_0`, `elem_1`, `elem_2`, ...

Each element tracks:
- Its position (matrix, row, col)
- Its value and color
- Elements it depends on (dependencies)
- Elements that depend on it (dependents)

### 2. Matrix Computation

**Operation**: O = S_left × K × S_right

**Step 1**: Compute KS = K × S_right
```javascript
KS[i][j] depends on:
  - K[i][t] for all t where K[i][t] ≠ 0 and S_right[t][j] ≠ 0
  - S_right[t][j] for all such t
```

**Step 2**: Compute O = S_left × KS
```javascript
O[i][j] depends on:
  - S_left[i][k] for all k where S_left[i][k] ≠ 0 and KS[k][j] ≠ 0
  - KS[k][j] for all such k
  - And transitively, all dependencies of KS[k][j]
```

### 3. Highlighting System

When you hover over any element:
1. Get element ID
2. Look up all dependencies in graph
3. Update highlightedElements store
4. All views reactively highlight matching elements

### 4. Adding a New View

Want to add a COO (Coordinate) format view?

```svelte
<!-- src/lib/COOView.svelte -->
<script>
  import { graph, highlightedElements, highlightElement } from './stores';
  
  // Convert graph to COO format
  $: cooElements = (() => {
    const result = [];
    for (const [id, node] of $graph.nodes) {
      if (node.value && node.matrixName === matrixName) {
        result.push({ id, row: node.row, col: node.col, color: node.color });
      }
    }
    return result;
  })();
</script>

{#each cooElements as elem}
  <div
    class:highlight={$highlightedElements.has(elem.id)}
    on:mouseover={() => highlightElement(elem.id)}
  >
    ({elem.row}, {elem.col})
  </div>
{/each}
```

Then import it in `App.svelte`:
```svelte
<script>
  import COOView from './lib/COOView.svelte';
</script>

<COOView matrixName="O" />
```

That's it! The view automatically participates in highlighting.

## Key Files to Understand

### `dependencyGraph.js`
- `DependencyGraph` class: Core data structure
- `createElement()`: Create element with unique ID
- `computeKS()`, `computeO()`: Establish dependencies

### `stores.js`
- `graph`: Writable store containing DependencyGraph
- `highlightedElements`: Set of currently highlighted IDs
- `initializeMatrices()`: Reset and create new matrices
- `toggleElement()`: Paint/unpaint a cell
- `highlightElement()`: Trigger highlighting

### `App.svelte`
- Main layout and controls
- Instantiates all views
- Handles user interactions (generate button, etc.)

## Debugging Tips

### View the Graph
Open browser console:
```javascript
// Get the graph (from Svelte DevTools or add debug code)
console.log($graph.nodes);
console.log($graph.matrices);
```

### Trace Dependencies
```javascript
// Find element at position
const elem = $graph.getElementAt('O', 1, 1);
console.log(elem.id, elem.dependencies);

// Get all dependencies
const deps = $graph.getAllDependencies(elem.id);
console.log([...deps]);
```

### Check Highlighting
```javascript
// See what's highlighted
console.log($highlightedElements);
```

## Common Tasks

### Change Matrix Size
- Adjust rows/cols inputs
- Click "Generate"
- Or programmatically: `initializeMatrices(8, 8, true, false)`

### Paint a Pattern
- Click cells to toggle them
- Current color is shown in color picker
- Use presets or custom color

### View Dependencies
- Hover over any cell in KS or O
- See red outlines in matrix views
- See red borders in CSR views

### Mirror S_right
- Check "Mirror S_right" checkbox
- S_right becomes a reference to S_left
- Changes to S_left automatically affect S_right

### Symmetric Matrices
- Check "Symmetric" checkbox
- Painting (i,j) also paints (j,i)

## Performance Notes

- Graph lookups are O(E) where E = number of edges
- Svelte reactivity only updates changed components
- For very large matrices (100×100+), consider:
  - Virtualizing the matrix view
  - Debouncing hover events
  - Using Web Workers for computation

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- CSS Grid and Flexbox

## License

MIT
