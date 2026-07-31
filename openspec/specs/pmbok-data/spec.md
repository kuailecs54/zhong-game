# PMBOK Data Specification

## Purpose

Defines the project management knowledge data (process groups, knowledge areas, processes, and ITTO) loaded by the game at runtime.

## Requirements

### Requirement: Process group data
The system SHALL define 5 project management process groups with Chinese names and colors.

#### Scenario: All 5 process groups available
- **WHEN** the game loads
- **THEN** data for all 5 process groups is available: 启动过程组, 规划过程组, 执行过程组, 监控过程组, 收尾过程组

### Requirement: Knowledge area data
The system SHALL define 10 project management knowledge areas with Chinese names.

#### Scenario: All 10 knowledge areas available
- **WHEN** the game loads
- **THEN** data for all 10 knowledge areas is available: 整合, 范围, 进度, 成本, 质量, 资源, 沟通, 风险, 采购, 相关方

### Requirement: Process data
The system SHALL define 49 project management processes, each mapped to one process group and one knowledge area.

#### Scenario: All 49 processes available
- **WHEN** the game loads
- **THEN** all 49 processes from the 3rd edition textbook are available
- **AND** each process has a unique ID, Chinese name, short name, process group association, knowledge area association, and difficulty rating (1-5)

#### Scenario: Matrix position is correct
- **WHEN** a process is placed in the grid at its correct matrix cell
- **THEN** the cell at the intersection of its process group column and knowledge area row is the correct position

### Requirement: ITTO data
The system SHALL store Inputs, Tools & Techniques, and Outputs (ITTO) for each process as a foundation for future game modes.

#### Scenario: ITTO data structure
- **WHEN** ITTO data is loaded
- **THEN** each process has arrays for inputs, toolsAndTechniques, and outputs
- **AND** each item has a name and optional tags (e.g., "core" for process-specific items, "common" for frequently appearing items)

### Requirement: Data loading
The system SHALL load game data from JSON files at runtime.

#### Scenario: Initial data load
- **WHEN** the game starts
- **THEN** process groups, knowledge areas, processes, and level configurations are loaded
- **AND** ITTO data is loaded only when needed by game modes that use it

#### Scenario: Data integrity
- **WHEN** data is loaded
- **THEN** every process references a valid process group ID and a valid knowledge area ID
