## MODIFIED Requirements

### Requirement: Knowledge area data
The system SHALL define 10 project management knowledge areas with Chinese names.

#### Scenario: All 10 knowledge areas available
- **WHEN** the game loads
- **THEN** data for all 10 knowledge areas is available: 整合, 范围, 进度, 成本, 质量, 资源, 沟通, 风险, 采购, 干系人

### Requirement: Process data
The system SHALL define 49 project management processes, each mapped to one process group and one knowledge area.

#### Scenario: All 49 processes available
- **WHEN** the game loads
- **THEN** all 49 processes from the 3rd edition textbook are available
- **AND** each process has a unique ID, Chinese name, short name, process group association, knowledge area association, and difficulty rating (1-5)

#### Scenario: Matrix position is correct
- **WHEN** a process is placed in the grid at its correct matrix cell
- **THEN** the cell at the intersection of its process group column and knowledge area row is the correct position

#### Scenario: Process names use textbook terminology
- **WHEN** the game loads
- **THEN** all process names follow the 3rd edition textbook terminology and do not introduce words absent from the textbook
- **AND** the stakeholder knowledge area processes are named 识别干系人, 规划干系人参与, 管理干系人参与, 监督干系人参与
- **AND** the plan-type processes are named 制订项目管理计划 and 制订进度计划 (using 制订)
- **AND** the processes 制定项目章程 and 制定预算 keep 制定 as the textbook does
