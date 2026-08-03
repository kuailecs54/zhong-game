# Sort Gameplay Specification — Delta

## MODIFIED Requirements

### Requirement: Matrix cell placement badges
The system SHALL display a fixed-width book spine with a count badge on matrix cells that have received correctly placed cards.

#### Scenario: Cell shows book spine and count
- **WHEN** a card is correctly placed into a matrix cell
- **THEN** the cell shows one fixed-width book spine with the process full name
- **AND** the book spine shows a count badge (e.g., ×3) when the process has been placed more than once

#### Scenario: Badge updates on repeat placement
- **WHEN** the same process is placed into the same matrix cell again
- **THEN** the single book spine remains fixed width
- **AND** the count badge increases by one

#### Scenario: Spine text stays on a single unwrapped column
- **WHEN** a matrix cell book spine displays its process name
- **THEN** the name is rendered vertically on a single unwrapped column, truncated if it exceeds the cell height
