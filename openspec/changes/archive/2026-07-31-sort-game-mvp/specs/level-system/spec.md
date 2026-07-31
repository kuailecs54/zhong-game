## ADDED Requirements

### Requirement: Level structure
The system SHALL provide 12 sort levels organized in 4 stages of increasing difficulty.

#### Scenario: Four stages of levels
- **WHEN** the player views the level selection screen
- **THEN** 4 stages are displayed
- **AND** each stage contains 3 levels

#### Scenario: Stage progression
- **WHEN** the player has not completed the previous stage
- **THEN** subsequent stages are locked and cannot be accessed

### Requirement: Level unlocking
The system SHALL unlock the next level when the current level is completed with at least 1 star.

#### Scenario: Complete level unlocks next
- **WHEN** the player completes a level with at least 1 star
- **THEN** the next level in the same stage becomes playable
- **AND** if it was the last level of a stage, the first level of the next stage becomes playable

#### Scenario: Initial state
- **WHEN** a new player first views level selection
- **THEN** only level 1-1 is unlocked
- **AND** all other levels are locked

### Requirement: Level configuration
Each level SHALL define its layout, card pool, difficulty parameters, and goals.

#### Scenario: Column-based layout
- **WHEN** a level uses column layout (stages 1-3)
- **THEN** the grid consists of multiple vertical columns
- **AND** each column represents a process group or knowledge area
- **AND** cards must be placed into the correct column

#### Scenario: Matrix layout
- **WHEN** a level uses matrix layout (stage 4)
- **THEN** the grid is a 2D matrix with rows as knowledge areas and columns as process groups
- **AND** cards must be placed into the correct cell (row + column intersection)

### Requirement: Star persistence
The system SHALL save the best star rating for each level.

#### Scenario: Stars saved on completion
- **WHEN** the player completes a level
- **THEN** the star rating is saved to localStorage if it's better than the previous best

#### Scenario: Stars displayed on level select
- **WHEN** the player views the level selection screen
- **THEN** each unlocked level shows its best star rating (0-3 stars)

### Requirement: Difficulty progression within levels
The system SHALL increase spawn rate and fall speed as the level progresses.

#### Scenario: Speed increases during level
- **WHEN** the player has correctly placed 2/3 of the target cards
- **THEN** the fall speed increases
- **AND** the spawn interval decreases
