# Frontend Refactor Checklist (SOLID Principles)

This document outlines a SOLID-driven refactor plan for all major frontend components, including concrete subcomponent suggestions and a general checklist for breaking down your codebase.

---

## Refactor Progress: StructureVisualizer

- The StructureVisualizer component was refactored by splitting the original TreeNode logic into smaller, focused subcomponents: DirectoryTree, DirectoryNode, and FileNode.
- No new features or UI elements were added; the refactor strictly preserved all original behavior and structure.
- The codebase now uses a shared FileTreeNode type and per-component prop interfaces for improved maintainability and type safety.
- Any previously added search or legend components have been omitted per user request to keep the refactor minimal and faithful to the original.

**Next step:** Begin refactoring the next visualizer component, following the same approach: strict refactor with no feature additions.

---

## 1. StructureVisualizer
- [x] Extract `DirectoryTree` (renders recursive tree structure)
- [x] Extract `FileNode` (renders a single file node, badges, icons)
- [x] Extract `DirectoryNode` (renders a single directory node, handles expand/collapse)
- [x] Extract `FilePreviewPanel` (shows file content preview)

---

## 2. ComponentVisualizer
- [ ] Extract `ComponentSearchBar` (search/filter input)
- [ ] Extract `ComponentGraph` (React Flow wrapper for nodes/edges)
- [ ] Extract `ComponentNodeDetails` (details panel for selected node)
- [ ] Extract `ComponentMiniMap` (overview map, if not handled by React Flow)
- [ ] Extract `ComponentLegend` (explains node/edge types)
- [ ] Extract `ComponentToolbar` (controls for layout, filtering, etc.)

---

## 3. DependencyVisualizer
- [ ] Extract `DependencyGraph` (Mermaid or D3 graph)
- [ ] Extract `DependencyFilterBar` (filter by type, severity, etc.)
- [ ] Extract `CircularDependencyAlert` (shows circular dependency warnings)
- [ ] Extract `DependencyLegend`
- [ ] Extract `DependencyDetailsPanel` (shows details for selected module)

---

## 4. SolidVisualizer
- [ ] Extract `SolidScorePanel` (shows SOLID scores)
- [ ] Extract `SolidIssueList` (lists violations)
- [ ] Extract `SolidIssueItem` (renders a single issue)
- [ ] Extract `SolidRecommendationPanel` (shows suggestions)
- [ ] Extract `SolidLegend`

---

## 5. RefactorVisualizer
- [ ] Extract `RefactorSuggestionList` (lists suggestions)
- [ ] Extract `RefactorSuggestionCard` (shows before/after, impact)
- [ ] Extract `RefactorCodeDiff` (renders code diff)
- [ ] Extract `RefactorImpactStats`
- [ ] Extract `RefactorExportButton`
- [ ] Extract `RefactorViewToggle` (toggle between code/diagram views)

---

## 6. UI Custom Components
- [ ] Extract `AnalyzerHeader` (already a component)
- [ ] Extract `ProjectSelector` (already a component)
- [ ] Extract `SettingsDialog` (if you have settings)
- [ ] Extract `AppTabs` (tab navigation, if not already separate)
- [ ] Extract `LoadingSpinner`, `ErrorBanner`, `Toast` (if reused)

---

## General Checklist for Each Component
- [ ] Identify sections with distinct responsibilities or repeated code.
- [ ] Move each section into its own file/component.
- [ ] Pass only the necessary props to each subcomponent.
- [ ] Use folders (e.g., `/visualizers/subcomponents/`) to organize.
- [ ] Write/adjust tests for extracted components.
- [ ] Update imports and parent component logic.

---

## Why Refactor?
- Each component does one thing (SRP).
- Easier to add features (OCP).
- Improved readability and maintainability.
- Simplifies testing and reuse.

---

**Tip:** Start with the largest or most complex visualizer first, and extract subcomponents one at a time. Use this checklist to track progress.

---
## Example Extracted Component

How This Refactoring Follows SOLID Principles
Single Responsibility Principle (SRP):
Each subcomponent is responsible for one thing only:
DirectoryTree handles rendering the entire tree.
DirectoryNode renders a single directory and manages expand/collapse.
FileNode renders a single file with badges/icons.
FilePreviewPanel displays file content.
StructureLegend explains icons/badges.
StructureToolbar manages search/filter controls.
This makes each component easier to test, maintain, and reason about.
Open/Closed Principle (OCP):
Components are open for extension (e.g., you can add new file badges or node types) but closed for modification (the core logic of each subcomponent doesn’t need to change).
For example, you can extend FileNode to support new file types without changing its core rendering logic.
Liskov Substitution Principle (LSP):
Each subcomponent can be replaced with a more specialized version (e.g., a custom FileNode for certain file types) without breaking the parent component.
Interface Segregation Principle (ISP):
Each component receives only the props it needs (e.g., FileNode gets file data, FilePreviewPanel gets file content).
No component is forced to depend on props it doesn’t use.
Dependency Inversion Principle (DIP):
High-level components (StructureVisualizer) depend on abstractions (subcomponents), not concrete details.
Data and callbacks are passed down via props, making the system flexible and decoupled.