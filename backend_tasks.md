# Backend Task Breakdown

This document breaks down all backend tasks from `tasklist.md` into actionable subtasks, and provides pseudocode/function outlines for each core analysis module.

---

## 1. Set up Node.js/Express.js server
- [x] Initialize Node.js project with TypeScript (`package.json`, `tsconfig.json`)
- [x] Set up Express.js server (`src/server.ts`)
- [x] Configure middleware (CORS, body-parser) (`src/server.ts`)
- [x] Set up environment variables (.env)
- [x] Add error handling middleware (comprehensive error and 404 handling added to Express server)
- [x] Create base API route (e.g., /api/health)

## 2. Implement file system interface for reading project files
- [x] Use `fs` and `path` modules
- [x] Functions for:
  - [x] Recursively reading directories/files
  - [x] Filtering file types (e.g., .ts, .tsx, .js, .jsx)
  - [x] Reading file contents
  - [x] Collecting file metadata (size, path, etc.)
- [x] Handle symlinks and ignore node_modules/.git

## 3. Create TypeScript parser using @typescript-eslint/typescript-estree
- [x] Install and configure parser
- [x] Function to parse a file and return AST
- [x] Utility to extract nodes (imports, exports, classes, functions, etc.)
- [x] Handle parse errors gracefully

## 4. Core Analysis Modules
Each module gets its own file in `/src/analyzers/`. All modules receive project file data and return analysis results matching frontend expectations.

- [x] Scaffolding: Created analyzer files for structure, component, route, typescript, dependency, solid, and refactor analyzers in `src/analyzers/` (all with TODO stubs)
- [x] Created utilities: `src/utils/fileSystem.ts` and `src/utils/parser.ts` (with TODO stubs)

### 4.1 Structure Analyzer (`structureAnalyzer.ts`) ✅
**Purpose:** Build directory/file tree with metadata.

**Implemented Functions:**
- [x] `analyzeStructure(projectRoot: string): Promise<{name: string, structure: DirectoryNode}>`
- [x] `annotateNextJsStructure(node: DirectoryNode): void`
- [x] `countFilesByType(structure: DirectoryNode): {...}`

The Structure Analyzer now scans project directories, builds a tree structure, annotates Next.js-specific directories, and provides file type statistics.

---

### 4.2 Component Analyzer (`componentAnalyzer.ts`) ✅
**Purpose:** Identify React components, their relationships, and props.

**Implemented Functions:**
- [x] `analyzeComponents(fileData: FileNode[]): Promise<ComponentGraph>`
- [x] `getComponentStats(graph: ComponentGraph): {...}`

The Component Analyzer now identifies React components in TypeScript/JavaScript files, extracts their props, builds a relationship graph based on imports/exports, and provides usage statistics. It supports various component types (regular components, pages, layouts, hooks, utilities) and calculates positions for visualization.

---

### 4.3 Route Analyzer (`routeAnalyzer.ts`) ✅
**Purpose:** Map Next.js routes to files/components.

**Implemented Functions:**
- [x] `analyzeRoutes(structure: DirectoryNode): RouteMap`
- [x] `findPageFiles(structure: DirectoryNode): FileNode[]`
- [x] `findDirectory(node: DirectoryNode, name: string): DirectoryNode | null`
- [x] `processPageDirectory(dir: DirectoryNode, basePath: string): RouteInfo[]`
- [x] `processAppDirectory(dir: DirectoryNode, basePath: string): RouteInfo[]`

The Route Analyzer now maps Next.js routes to files and components, supporting both Pages Router and App Router patterns. It handles dynamic routes, API routes, catch-all routes, and route groups, and provides comprehensive statistics on route usage.

---

### 4.4 TypeScript Analyzer (`typescriptAnalyzer.ts`) ✅
**Purpose:** Gather type/interface usage, type coverage, and detect type issues.

**Implemented Functions:**
- [x] `analyzeTypes(fileData: FileNode[]): Promise<TypeAnalysis>`
- [x] `extractTypeDefinitions(ast: TSESTree.Program): Node[]`
- [x] Type coverage, type usage, and issue detection

The TypeScript Analyzer now extracts interfaces, types, enums, and classes, analyzes type coverage, finds issues (e.g., `any` usage), and builds a type hierarchy.
---

### 4.5 Dependency Analyzer (`dependencyAnalyzer.ts`)
**Purpose:** Build module dependency graph, detect circular dependencies.

**Pseudocode:**
```ts
// dependencyAnalyzer.ts
export function analyzeDependencies(fileData: FileNode[]): DependencyGraph {
  // For each file, extract imports/exports
  // Build dependency nodes/edges
  // Detect circular dependencies
  return dependencyGraph;
}
```
**Main Functions:**
- `analyzeDependencies(fileData: FileNode[]): DependencyGraph`
- `detectCircularDependencies(graph: DependencyGraph): Cycle[]`

---

### 4.6 SOLID Analyzer (`solidAnalyzer.ts`)
**Purpose:** Analyze code for SOLID principle adherence, report issues and scores.

**Pseudocode:**
```ts
// solidAnalyzer.ts
export function analyzeSOLID(fileData: FileNode[]): SolidReport {
  // For each file/component, check for SOLID violations
  // Aggregate issues and compute scores
  return solidReport;
}
```
**Main Functions:**
- `analyzeSOLID(fileData: FileNode[]): SolidReport`
- `checkSRP(ast: TSESTree.Program): SolidIssue[]`
- `checkOCP(ast: TSESTree.Program): SolidIssue[]`
// ... repeat for LSP, ISP, DIP

---

### 4.7 Refactor Analyzer (`refactorAnalyzer.ts`)
**Purpose:** Suggest actionable refactors based on analysis results.

**Pseudocode:**
```ts
// refactorAnalyzer.ts
export function analyzeRefactors(analysisResults: AllAnalysisResults): RefactorSolution[] {
  // Use other analyzers' output
  // Generate refactor suggestions
  // Provide before/after code and impact
  return solutions;
}
```
**Main Functions:**
- `analyzeRefactors(analysisResults: AllAnalysisResults): RefactorSolution[]`
- `generateSuggestion(issue: SolidIssue | DependencyIssue): RefactorSolution`

---

## 5. Implement analysis cache for storing results
- [ ] Use in-memory or file-based cache (e.g., Redis, local JSON)
- [ ] Functions to store, retrieve, and invalidate analysis results

## 6. Create visualization data generators
- [ ] Convert analysis results to frontend data shapes (see `frontend_data.md`)
- [ ] Functions to map raw analysis to nodes, edges, stats, etc.

## 7. Set up API endpoints for frontend communication
- [ ] RESTful endpoints for each analysis type (e.g., `/api/structure`, `/api/components`, etc.)
- [ ] Endpoint to trigger full project analysis
- [x] Error handling and status endpoints (added in Express server)

## 8. Integration Tasks
- [ ] Connect frontend to backend endpoints
- [ ] Implement loading/error states in frontend
- [ ] Test end-to-end data flow

---

**Status Notes:**
- ✅ All core analyzers (structure, component, route, dependency, SOLID, refactor, typescript) implemented
- ✅ Robust file system and parser utilities
- ✅ Error handling middleware present
- ⏳ API endpoints and integration next
- ⏳ Analysis cache and visualization data generators pending
- ⏳ Datastructure adaptations between frontend and backend @integration_tasks
