# Frontend Data Requirements

This document specifies the data structures expected by each major frontend component for the Refactor - Next.js TypeScript Analyzer project.

---

## 1. StructureVisualizer
**Purpose:** Display project file/directory tree with metadata and file preview.

**Expected Data:**
```ts
// Directory structure
interface DirectoryNode {
  name: string;
  path: string;
  type: 'directory';
  children: (FileNode | DirectoryNode)[];
  metadata?: {
    fileCount?: number;
    isPages?: boolean;
    isApp?: boolean;
    isComponents?: boolean;
  };
}

interface FileNode {
  name: string;
  path: string;
  type: 'file';
  size?: number;
  extension?: string;
  metadata?: {
    imports?: number;
    exports?: number;
    isPage?: boolean;
    isComponent?: boolean;
    isLayout?: boolean;
  };
}

// Top-level prop
interface StructureVisualizerProps {
  projectData?: {
    name: string;
    structure: DirectoryNode;
  };
}
```

---

## 2. ComponentVisualizer
**Purpose:** Show component hierarchy, relationships, and props using a graph.

**Expected Data:**
```ts
type CustomNode = Node<ComponentNodeData>; // from @xyflow/react

interface ComponentNodeData {
  label: string;
  filePath: string;
  type: 'component' | 'page' | 'layout' | 'utils' | 'hook';
  props?: string[];
  imports?: number;
  exports?: number;
}

interface ComponentVisualizerProps {
  projectData?: {
    components: CustomNode[];
    relationships: Edge[]; // from @xyflow/react
  };
}
```

---

## 3. DependencyVisualizer
**Purpose:** Visualize module dependencies as a graph and Mermaid diagram.

**Expected Data:**
```ts
interface DependencyNode {
  id: string;
  label: string;
  filePath: string;
  type: 'component' | 'page' | 'api' | 'util' | 'hook' | 'lib' | 'config';
  imports: string[];
  exports: string[];
}

interface DependencyVisualizerProps {
  projectData?: {
    dependencies: DependencyNode[];
    circularDependencies?: {
      path: string[];
      severity: 'warning' | 'critical';
    }[];
  };
}
```

---

## 4. SolidVisualizer
**Purpose:** Display SOLID principle adherence, issues, and scores.

**Expected Data:**
```ts
interface SolidIssue {
  id: string;
  principle: 'SRP' | 'OCP' | 'LSP' | 'ISP' | 'DIP';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  filePath: string;
  line?: number;
  recommendation: string;
  codeSnippet?: string;
}

interface SolidReport {
  score: {
    srp: number;
    ocp: number;
    lsp: number;
    isp: number;
    dip: number;
    overall: number;
  };
  issues: SolidIssue[];
  stats: {
    filesAnalyzed: number;
    totalComponents: number;
    totalIssues: number;
    criticalIssues: number;
  };
}

interface SolidVisualizerProps {
  projectData?: {
    solidReport: SolidReport;
  };
}
```

---

## 5. RefactorVisualizer
**Purpose:** Show actionable refactor suggestions, before/after code, and impact.

**Expected Data:**
```ts
interface RefactorSolution {
  id: string;
  title: string;
  description: string;
  issueType: 'srp' | 'ocp' | 'lsp' | 'isp' | 'dip' | 'structure';
  severity: 'low' | 'medium' | 'high';
  beforeCode: string;
  afterCode: string;
  beforeFiles: Array<{ name: string; path: string }>;
  afterFiles: Array<{ name: string; path: string }>;
  impact: {
    components: number;
    functions: number;
    files: number;
  };
  flowDiagram: string; // Mermaid or similar
}

interface RefactorVisualizerProps {
  projectData?: {
    solutions: RefactorSolution[];
  };
}
```

---

## 6. ProjectSelector & AnalyzerHeader
**Purpose:** UI only, no backend data required (except project path selection).

---

## Notes
- All visualizers accept a `projectData` prop with the relevant structure.
- For integration, the backend should provide endpoints returning these structures as JSON.
- Mock data in the frontend matches these interfaces.
