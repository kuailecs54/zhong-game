# Book Shelf Specification

## Purpose

Defines the multi-layer bookshelf presentation and interaction: accumulation of correctly placed books, merging of same-name books with count badges, layer planning from the level's target count, placement targeting, and preview.
## Requirements
### Requirement: Book accumulation on shelf
The system SHALL accumulate correctly placed cards as books on the bookshelf.

#### Scenario: Correct placement adds book
- **WHEN** the player correctly places a card into a shelf column
- **THEN** a book representing that process appears in that column's section on the shelf
- **AND** the book remains on the shelf for the rest of the level

#### Scenario: Wrong placement does not add book
- **WHEN** the player places a card into an incorrect column
- **THEN** no book is added to the shelf

### Requirement: Same-name books merge with count badge
The system SHALL merge repeated placements of the same process in the same column into a single book with a count badge.

#### Scenario: Repeated placement thickens the book
- **WHEN** the same process is placed in the same column multiple times
- **THEN** the books merge into one book spine whose thickness increases with each placement
- **AND** the book shows a count badge (e.g., ×5) when placed more than once

### Requirement: Bookshelf placement layout
The system SHALL position the bookshelf in a dedicated space to the right of the game area.

#### Scenario: Bookshelf on the right side
- **WHEN** a columns-layout level is active
- **THEN** the bookshelf is displayed in an independent panel to the right of the game area
- **AND** the game area bottom shows no grid
- **AND** the desk is the only element below the game area

### Requirement: Multi-layer bookshelf with per-book-type layers
The system SHALL display each column's books on a multi-layer bookcase, assigning each distinct book type its own layer filled from bottom upward.

#### Scenario: Distinct book types occupy separate layers
- **WHEN** books of different processes are placed in the same column
- **THEN** each distinct process occupies its own layer, filled from the bottom layer upward

#### Scenario: Repeated placements merge within the book's layer
- **WHEN** the same process is placed in the same column multiple times
- **THEN** all copies merge into a single book spine with a count badge (e.g., ×5) on that process's layer

#### Scenario: Column layer count reflects placed book types
- **WHEN** a level is active in columns layout
- **THEN** each column renders exactly as many layers as the distinct book types placed in it (at least one)
- **AND** no empty planned boards are rendered

### Requirement: Placement by drag and drop
The system SHALL support placing a tray card by dragging it from the desk onto a shelf column and highlight only applicable columns.

#### Scenario: Drag and drop places card
- **WHEN** the player drags a tray card from the desk and releases it over a matching shelf column
- **THEN** the card is placed in that column
- **AND** correct/wrong feedback plays on the section

#### Scenario: Only applicable columns highlighted
- **WHEN** the player drags a tray card
- **THEN** only columns matching the card's process group (or knowledge area) are highlighted as placeable
- **AND** a dashed ghost preview book appears on the layer where the card would be placed

#### Scenario: Drop near a shelf column snaps to the nearest column
- **WHEN** the player releases the dragged card within the bookshelf panel but outside any column section
- **THEN** the card is placed into the nearest column by distance

#### Scenario: Failed drop shows a hint
- **WHEN** the player releases the dragged card outside the bookshelf panel, or during an active feedback window
- **THEN** no card is placed
- **AND** the desk shows a brief hint prompting the player to drop onto a matching shelf

### Requirement: Book spine display
The system SHALL display shelved books as upright spines with vertical process names.

#### Scenario: Books stand upright
- **WHEN** books are placed on the shelf
- **THEN** each book renders as a tall narrow spine filling its layer height

#### Scenario: Spine text reads top-to-bottom
- **WHEN** a book spine displays its process name
- **THEN** the name is rendered vertically, reading from top to bottom without rotation

