# Book Shelf Specification — Delta

## MODIFIED Requirements

### Requirement: Same-name books merge with count badge
The system SHALL merge repeated placements of the same process in the same column into a single book with a count badge, keeping the book spine at a fixed width.

#### Scenario: Repeated placement shows count badge
- **WHEN** the same process is placed in the same column multiple times
- **THEN** the books merge into one book spine of fixed width (does not thicken with additional placements)
- **AND** the book shows a count badge (e.g., ×5) when placed more than once

### Requirement: Multi-layer bookshelf with per-book-type layers
The system SHALL lay out each column's books side by side on a single layer, and automatically add a new layer above only when the current layer is full.

#### Scenario: Books stand side by side on one layer
- **WHEN** books of different processes are placed in a column
- **THEN** each distinct process renders as one upright spine, placed side by side from left to right on the same layer
- **AND** the layer is filled from bottom upward (new books enter the lowest layer that has space)

#### Scenario: Single-layer priority
- **WHEN** the number of distinct book types in a column fits within the layer capacity
- **THEN** all books render on a single layer

#### Scenario: Automatic new layer when full
- **WHEN** the number of distinct book types exceeds the current layer capacity
- **THEN** an additional layer is added above the full layer
- **AND** no empty planned layers are rendered before they are needed

#### Scenario: Layer capacity from unit width
- **WHEN** a column's books are laid out
- **THEN** the layer capacity is computed from the unit width and the fixed spine width (default 20px, min 14px on narrow units)

### Requirement: Book spine display
The system SHALL display shelved books as upright spines with vertical process names on a single unwrapped column.

#### Scenario: Books stand upright
- **WHEN** books are placed on the shelf
- **THEN** each book renders as a tall narrow spine filling its layer height

#### Scenario: Spine text reads top-to-bottom without wrapping
- **WHEN** a book spine displays its process name
- **THEN** the name is rendered vertically, reading from top to bottom without rotation
- **AND** the name stays on a single unwrapped column, truncated if it exceeds the layer height

## ADDED Requirements

### Requirement: Ghost preview follows layer layout
The system SHALL place the drag ghost preview according to the capacity-based layer layout.

#### Scenario: Ghost preview next to existing same-process book
- **WHEN** the player drags a card whose process is already placed in the column
- **THEN** the ghost preview appears directly after that book spine on its layer

#### Scenario: Ghost preview at end of lowest free layer
- **WHEN** the player drags a card of a new process for the column
- **THEN** the ghost preview appears at the end of the lowest layer that has space
