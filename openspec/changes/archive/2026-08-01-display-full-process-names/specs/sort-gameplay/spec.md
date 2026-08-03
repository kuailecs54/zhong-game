## MODIFIED Requirements

### Requirement: Matrix cell placement badges
The system SHALL display a count badge on matrix cells that have received correctly placed cards.

#### Scenario: Badge shows placed count
- **WHEN** a card is correctly placed into a matrix cell
- **THEN** the cell shows the process full name and a count badge (e.g., ×3 when placed 3 times)

#### Scenario: Badge updates on repeat placement
- **WHEN** the same process is placed into the same matrix cell again
- **THEN** the badge count increases by one

### Requirement: Falling cards rendered as books
The system SHALL render falling cards with a book-like appearance.

#### Scenario: Falling card looks like a book
- **WHEN** a card falls in the game area
- **THEN** it displays a dark spine on the left, a gradient cover with the full process name, and a page-edge detail on the right

#### Scenario: Compact books on the desk
- **WHEN** a captured card is shown in the desk tray or the drag ghost
- **THEN** it keeps the book-like appearance in a smaller compact size and displays the full process name
