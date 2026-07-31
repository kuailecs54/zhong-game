## ADDED Requirements

### Requirement: Username entry on first visit
The system SHALL require the user to enter a username on their first visit before accessing any game content.

#### Scenario: First visit shows username entry
- **WHEN** a user opens the game for the first time (no username stored in localStorage)
- **THEN** the username entry screen is displayed

#### Scenario: Username cannot be empty
- **WHEN** the user clicks confirm with an empty or whitespace-only username
- **THEN** the system shows an error message and does not proceed

#### Scenario: Valid username submitted
- **WHEN** the user enters a valid username (1-20 characters) and clicks confirm
- **THEN** the username is saved to localStorage
- **AND** the user is taken to the level selection screen

### Requirement: Persistent user profile
The system SHALL persist the user's profile (username and progress) in localStorage so it survives page reloads.

#### Scenario: Returning user skips username entry
- **WHEN** a user with a saved username returns to the game
- **THEN** the game proceeds directly to the level selection screen
- **AND** the username is displayed in the UI

#### Scenario: Progress persists across sessions
- **WHEN** a user completes a level and then reloads the page
- **THEN** the previously earned stars and unlocked levels remain available
