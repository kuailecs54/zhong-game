## ADDED Requirements

### Requirement: Card falling mechanics
The system SHALL display process name cards that fall from the top of the game area at a speed defined by the current level.

#### Scenario: Cards spawn at top and fall downward
- **WHEN** a sort level is active
- **THEN** cards spawn at random horizontal positions at the top of the game area
- **AND** each card falls downward at a constant speed

#### Scenario: Card reaches bottom
- **WHEN** a card falls past the bottom of the game area without being captured
- **THEN** the player loses one life
- **AND** the card is removed from play

### Requirement: Card capture
The system SHALL allow the player to capture a falling card by clicking it.

#### Scenario: Click captures card
- **WHEN** the player clicks a falling card
- **THEN** the card is removed from the falling area
- **AND** the card appears in the capture tray (待放置区)

#### Scenario: Capture tray capacity
- **WHEN** the capture tray already contains 3 cards and the player clicks another falling card
- **THEN** the click has no effect (card continues falling)
- **AND** a visual indicator shows the tray is full

### Requirement: Card placement in grid
The system SHALL allow the player to place a captured card into a target grid cell.

#### Scenario: Place correct card
- **WHEN** the player clicks a card in the capture tray and then clicks a grid cell that matches the card's process group (and knowledge area for matrix levels)
- **THEN** the card is removed from the tray
- **AND** score is awarded
- **AND** a success animation plays

#### Scenario: Place wrong card
- **WHEN** the player clicks a card in the capture tray and then clicks an incorrect grid cell
- **THEN** the card returns to the capture tray
- **AND** points are deducted
- **AND** the combo counter resets to 0
- **AND** a failure animation plays

### Requirement: Lives system
The system SHALL track the player's remaining lives and end the level when lives reach zero.

#### Scenario: Start with 3 lives
- **WHEN** a level begins
- **THEN** the player has 3 lives

#### Scenario: Lose all lives
- **WHEN** the player's last life is lost
- **THEN** the level ends in failure
- **AND** a failure screen is shown with option to retry

### Requirement: Combo system
The system SHALL track consecutive correct placements and award score multipliers.

#### Scenario: Combo increases on correct placement
- **WHEN** the player correctly places a card
- **THEN** the combo counter increments by 1
- **AND** the score multiplier increases (capped at x5)

#### Scenario: Combo resets on wrong placement
- **WHEN** the player places a card incorrectly
- **THEN** the combo counter resets to 0
- **AND** the score multiplier resets to x1

### Requirement: Power-ups
The system SHALL provide power-ups that the player can use during a level.

#### Scenario: Freeze power-up
- **WHEN** the player activates the freeze power-up
- **THEN** all falling cards pause for 3 seconds
- **AND** the power-up is consumed

#### Scenario: Power-up availability
- **WHEN** a level starts
- **THEN** the player has 1 freeze power-up available

### Requirement: Scoring
The system SHALL calculate scores based on correct placements and combo multipliers.

#### Scenario: Base score with combo
- **WHEN** a card is correctly placed
- **THEN** the score increases by 100 × current combo multiplier (minimum x1, maximum x5)

#### Scenario: Penalty for wrong placement
- **WHEN** a card is placed incorrectly
- **THEN** 50 points are deducted from the score
- **AND** the score cannot go below 0

### Requirement: Level completion
The system SHALL track the number of correctly placed cards and complete the level when the target is reached.

#### Scenario: Reach target correct count
- **WHEN** the player correctly places the target number of cards
- **THEN** the level ends successfully
- **AND** a results screen shows the final score, accuracy, and star rating

#### Scenario: Star rating based on performance
- **WHEN** a level is completed successfully
- **THEN** 1 star is awarded for completing the level
- **AND** 2 stars are awarded if accuracy >= 80%
- **AND** 3 stars are awarded if accuracy is 100% and at least 2 lives remain
