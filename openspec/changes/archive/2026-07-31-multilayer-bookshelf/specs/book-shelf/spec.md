# Book Shelf Specification

## Purpose

Defines the multi-layer bookshelf presentation and interaction: accumulation of correctly placed books, merging of same-name books with count badges, layer planning from the level's target count, placement targeting, and preview.

## ADDED Requirements

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

### Requirement: Multi-layer bookshelf with planned layers
The system SHALL display the bookshelf as a multi-layer bookcase whose layer count is planned from the level's target count.

#### Scenario: Layer count derived from target count
- **WHEN** a level starts in columns layout
- **THEN** the bookshelf shows layers = ceil(targetCount / 5) shelf boards (2-6 layers for current levels)
- **AND** empty planned boards are rendered in a dimmed style

#### Scenario: Books fill from bottom layer upward
- **WHEN** more than 5 books are placed in one column section
- **THEN** the books continue onto the next shelf board above

### Requirement: Placement targeting and preview
The system SHALL support placing the selected card by clicking a shelf column and highlight only applicable columns.

#### Scenario: Click section places selected card
- **WHEN** the player selects a card in the tray and clicks a shelf column
- **THEN** the card is placed in that column
- **AND** correct/wrong feedback plays on the section

#### Scenario: Only applicable columns highlighted
- **WHEN** the player selects a card in the tray
- **THEN** only columns matching the card's process group (or knowledge area) are highlighted as placeable
- **AND** a dashed ghost preview book appears at the end of the lowest free layer of each applicable column

### Requirement: Bookshelf placement layout
The system SHALL position the bookshelf in a dedicated space to the right of the game area.

#### Scenario: Bookshelf on the right side
- **WHEN** a columns-layout level is active
- **THEN** the bookshelf is displayed in an independent panel to the right of the game area
- **AND** the game area bottom shows no grid
- **AND** the desk is the only element below the game area
