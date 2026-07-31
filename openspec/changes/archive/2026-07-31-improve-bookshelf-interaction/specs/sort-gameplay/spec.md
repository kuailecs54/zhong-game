## REMOVED Requirements

### Requirement: Card capture
**Reason**: 捕获交互由 `click` 改为 `pointerdown`——移动目标上 click 要求按下与松开落在同一元素，卡片或人手稍动即错失；同时扩展命中区域。
**Migration**: 新行为由新增需求 "Card capture by press" 定义。

## ADDED Requirements

### Requirement: Card capture by press
The system SHALL allow the player to capture a falling card by pressing on it, with an extended hit area.

#### Scenario: Press captures card
- **WHEN** the player presses (pointerdown) on a falling card or within its extended hit area
- **THEN** the card is removed from the falling area
- **AND** the card appears in the capture tray (待放置区)

#### Scenario: Capture tray capacity
- **WHEN** the capture tray already contains 3 cards and the player presses another falling card
- **THEN** the press has no effect (card continues falling)
- **AND** a visual indicator shows the tray is full

### Requirement: Falling cards rendered as books
The system SHALL render falling cards with a book-like appearance.

#### Scenario: Falling card looks like a book
- **WHEN** a card falls in the game area
- **THEN** it displays a dark spine on the left, a gradient cover with the process name, and a page-edge detail on the right

#### Scenario: Compact books on the desk
- **WHEN** a captured card is shown in the desk tray or the drag ghost
- **THEN** it keeps the book-like appearance in a smaller compact size
