## MODIFIED Requirements

### Requirement: Card placement in grid
The system SHALL allow the player to place a captured card into a target grid cell.

#### Scenario: Place correct card
- **WHEN** the player clicks a card in the capture tray and then clicks a grid cell that matches the card's process group (and knowledge area for matrix levels)
- **THEN** the card is removed from the tray
- **AND** score is awarded
- **AND** a success animation plays
- **AND** the placed card is added to the bookshelf (columns layout) or to the matrix cell count badge (matrix layout)

#### Scenario: Place wrong card
- **WHEN** the player clicks a card in the capture tray and then clicks an incorrect grid cell
- **THEN** the card returns to the capture tray
- **AND** points are deducted
- **AND** the combo counter resets to 0
- **AND** a failure animation plays

## ADDED Requirements

### Requirement: Matrix cell placement badges
The system SHALL display a count badge on matrix cells that have received correctly placed cards.

#### Scenario: Badge shows placed count
- **WHEN** a card is correctly placed into a matrix cell
- **THEN** the cell shows the process short name and a count badge (e.g., ×3 when placed 3 times)

#### Scenario: Badge updates on repeat placement
- **WHEN** the same process is placed into the same matrix cell again
- **THEN** the badge count increases by one
