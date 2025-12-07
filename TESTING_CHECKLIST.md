# Testing Checklist

## Basic Functionality Tests

### ✓ Initial Load
- [ ] Application loads without errors
- [ ] 5×5 matrices are displayed
- [ ] S_left, K, S_right are paintable
- [ ] KS and O are gray and read-only
- [ ] CSR panels show at bottom

### ✓ Painting
- [ ] Click cell in S_left → cell gets colored
- [ ] Click cell in K → cell gets colored
- [ ] Click cell in S_right → cell gets colored
- [ ] Click again → cell becomes unpainted
- [ ] Color picker changes current color
- [ ] Preset colors work

### ✓ Matrix Generation
- [ ] Change rows to 8, cols to 6 → Click Generate
- [ ] Matrices resize correctly
- [ ] Previous paint is cleared
- [ ] CSR updates to match new size

### ✓ Mirror S_right
- [ ] Check "Mirror S_right"
- [ ] Paint S_left cell → S_right updates
- [ ] Uncheck → S_right independent again

### ✓ Symmetric Mode
- [ ] Check "Symmetric"
- [ ] Paint S_left[2][4] → S_left[4][2] also painted
- [ ] Works for both S matrices

### ✓ Derived Matrix Computation

#### KS = K × S_right
- [ ] Paint K[0][1] (orange)
- [ ] Paint S_right[1][2] (cyan)
- [ ] KS[0][2] shows mini-blocks (orange, cyan)

#### O = S_left × KS
- [ ] Paint S_left[0][0] (red)
- [ ] Paint K[0][1] (green)
- [ ] Paint S_right[1][1] (blue)
- [ ] O[0][1] shows mini-blocks (red, green, blue)

### ✓ Highlighting - Matrix View

#### Hover KS cell
- [ ] Hover KS[0][1]
- [ ] K row 0 cells highlight (red outline)
- [ ] S_right column 1 cells highlight (red outline)
- [ ] Only painted cells highlight

#### Hover O cell
- [ ] Hover O[1][1]
- [ ] S_left row 1 cells highlight
- [ ] KS cells contributing highlight
- [ ] K cells (transitive) highlight
- [ ] S_right column 1 cells highlight

### ✓ Highlighting - CSR View

#### Hover CSR K value
- [ ] Hover value in K CSR panel
- [ ] Corresponding K matrix cell highlights
- [ ] CSR element gets red border

#### Hover CSR O value
- [ ] Hover value in O CSR panel
- [ ] All dependencies highlight in matrices
- [ ] All dependencies highlight in CSR panels
- [ ] S_left, K, S_right CSR values highlight

### ✓ Cross-View Highlighting
- [ ] Hover matrix cell → CSR values highlight
- [ ] Hover CSR value → matrix cells highlight
- [ ] Leave mouse → all highlights clear
- [ ] Multiple quick hovers work correctly

## Advanced Tests

### ✓ Dependency Tracking
Create this pattern:
```
S_left:  K:      S_right:
[1 0]    [1]     [1 0]
[0 0]    [0]     [0 1]

Expected KS:
[1 0]

Expected O:
[1 0]
[0 0]
```

- [ ] Paint S_left[0][0]
- [ ] Paint K[0][0]
- [ ] Paint S_right[0][0]
- [ ] Verify KS[0][0] appears with mini-blocks
- [ ] Verify O[0][0] appears with mini-blocks
- [ ] Hover O[0][0] → all 3 sources highlight

### ✓ Complex Pattern
Create diagonal pattern:
```
S_left = K = S_right = Identity matrix
```
- [ ] Generate 5×5 matrices
- [ ] Paint all diagonals
- [ ] Verify KS is also diagonal
- [ ] Verify O is also diagonal
- [ ] Hover any O diagonal → correct dependencies

### ✓ CSR Correctness
Paint a pattern, verify CSR:
```
Matrix:        Expected CSR:
[0 1 0]       row_offsets: [0, 1, 3, 3]
[1 0 1]       col_indices: [1, 0, 2]
[0 0 0]       values: [3 elements]
```

- [ ] CSR row_offsets correct
- [ ] CSR col_indices correct
- [ ] CSR values show colors
- [ ] Hover CSR value → matrix position correct

## Performance Tests

### ✓ Large Matrices
- [ ] Generate 20×20 matrices
- [ ] Application remains responsive
- [ ] Painting works
- [ ] Highlighting works
- [ ] No lag on hover

### ✓ Dense Patterns
- [ ] Paint 50+ cells
- [ ] Hover over derived matrix
- [ ] Highlighting performs well
- [ ] No freeze or stutter

## Browser Compatibility

### ✓ Chrome/Chromium
- [ ] Loads correctly
- [ ] All features work
- [ ] No console errors

### ✓ Firefox
- [ ] Loads correctly
- [ ] All features work
- [ ] No console errors

### ✓ Safari (if available)
- [ ] Loads correctly
- [ ] All features work
- [ ] No console errors

## Known Issues / Notes

Document any issues found:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

## Graph Integrity Checks

Open browser console and run:
```javascript
// Access stores (via Svelte DevTools or add window.debug)
const g = $graph;

// Check all elements have unique IDs
const ids = new Set();
for (const [id, node] of g.nodes) {
  if (ids.has(id)) console.error('Duplicate ID:', id);
  ids.add(id);
}
console.log('Unique IDs:', ids.size);

// Check dependency bidirectionality
for (const [id, node] of g.nodes) {
  for (const depId of node.dependencies) {
    const depNode = g.nodes.get(depId);
    if (!depNode.dependents.includes(id)) {
      console.error('Missing bidirectional link:', id, depId);
    }
  }
}
console.log('Bidirectionality check complete');

// Check CSR element IDs exist
const csr = g.getCSRWithIds('K');
for (const id of csr.elementIds) {
  if (!g.nodes.has(id)) {
    console.error('CSR references missing node:', id);
  }
}
console.log('CSR integrity check complete');
```

## Test Results

Date: _____________
Tester: _____________
Browser: _____________
OS: _____________

Overall Status: ⬜ PASS  ⬜ FAIL

Notes:
_______________________________________________
_______________________________________________
_______________________________________________
