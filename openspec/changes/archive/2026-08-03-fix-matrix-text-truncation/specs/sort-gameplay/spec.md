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
- **THEN** the name is rendered vertically on a single unwrapped column
- **AND** the cell height accommodates the longest process full name (up to 9 characters, e.g., "指导与管理项目工作") so the name displays completely without truncation

## ADDED Requirements

### Requirement: Matrix grid headers display full names
The system SHALL display complete textbook full names for matrix grid row headers (knowledge areas, up to 7 characters such as "项目干系人管理") and column headers (process groups) at any viewport width, without ellipsis truncation.

#### Scenario: Row headers show full knowledge area names
- **WHEN** a matrix level is active (including the full 5×10 grid)
- **THEN** every row header displays the complete knowledge area name (e.g., "项目整合管理", "项目干系人管理")
- **AND** no row header text is truncated with ellipsis

#### Scenario: Column headers show full process group names
- **WHEN** a matrix level is active
- **THEN** every column header displays the complete process group name (e.g., "启动过程组", "监控过程组")
- **AND** no column header text is truncated or clipped by the scroll container edge

#### Scenario: Falling card titles wrap without hard character breaks
- **WHEN** a falling card displays a long process full name (8–9 characters, e.g., "实施定量风险分析", "指导与管理项目工作")
- **THEN** the title is fully visible, wrapping by word/punctuation boundaries rather than hard character breaks
