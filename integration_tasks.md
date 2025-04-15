1. Structure Analyzer
Input: projectRoot: string (path to project directory)
Output:
ts
CopyInsert
{
  name: string;
  structure: DirectoryNode;
}
Matches Frontend: ✅ Yes, this exactly matches the StructureVisualizerProps.projectData interface in frontend_data.md.
Notes: Our DirectoryNode and FileNode interfaces in fileSystem.ts match the expected frontend interfaces.
2. Component Analyzer
Input: fileData: FileNode[] (array of file nodes from Structure Analyzer)
Output:
ts
CopyInsert
{
  components: ComponentNodeData[];
  relationships: ComponentRelationship[];
}
Matches Frontend: ⚠️ Partial match. Our ComponentNodeData has additional fields like id and position that aren't in the frontend spec, but includes all required fields. The frontend expects CustomNode[] (from @xyflow/react) which we'll need to transform to.
Adaptation Needed: When exposing via API, we'll need to map our data to match exactly what the frontend expects.
3. Route Analyzer
Input: structure: DirectoryNode (directory structure from Structure Analyzer)
Output:
ts
CopyInsert
{
  routes: RouteInfo[];
  stats: { ... };
}
Matches Frontend: ❌ No direct match in frontend_data.md. There's no RouteVisualizer specified.
Action Needed: We either need to add a frontend component for routes or integrate this data into another visualizer.
4. Dependency Analyzer (Not Yet Implemented)
Expected Input: fileData: FileNode[]
Expected Output: Should match:
ts
CopyInsert
{
  dependencies: DependencyNode[];
  circularDependencies?: { path: string[]; severity: string; }[];
}
Implementation Plan: Will need to analyze imports/exports across files and detect circular dependencies.
5. SOLID Analyzer (Not Yet Implemented)
Expected Input: fileData: FileNode[]
Expected Output: Should match:
ts
CopyInsert
{
  solidReport: {
    score: { srp: number, ocp: number, lsp: number, isp: number, dip: number, overall: number };
    issues: SolidIssue[];
    stats: { filesAnalyzed: number, totalComponents: number, totalIssues: number, criticalIssues: number };
  }
}
Implementation Plan: Will need to analyze component complexity, coupling, and adherence to SOLID principles.
6. Refactor Analyzer (Not Yet Implemented)
Expected Input: Results from other analyzers
Expected Output: Should match the RefactorVisualizer props (not shown in the current view)
Summary of Adjustments Needed:
Component Analyzer: Need to transform output to match exactly what @xyflow/react expects
Route Analyzer: Need to clarify how route data will be visualized in the frontend
Remaining Analyzers: Need to implement with outputs matching frontend expectations


----

### Component Analyzer Data Transformation:
Current Issue: Our ComponentNodeData has additional fields (id and position) that aren't in the frontend spec, and the frontend expects a CustomNode[] type from @xyflow/react.

Options:

API Transformation Layer:
Keep our current backend implementation as-is
Add a transformation function in the API endpoint that converts our data to the exact format expected by the frontend
Example:
typescript
CopyInsert
// In API endpoint
app.get('/api/components', async (req, res) => {
  const projectRoot = req.query.path;
  const fileData = await readProjectFiles(projectRoot);
  const componentData = await analyzeComponents(fileData);
  
  // Transform to frontend format
  const frontendData = {
    components: componentData.components.map(comp => ({
      id: comp.id, // Required by @xyflow/react but not in frontend spec
      position: comp.position, // Required by @xyflow/react but not in frontend spec
      data: {
        label: comp.label,
        filePath: comp.filePath,
        type: comp.type,
        props: comp.props,
        imports: comp.imports,
        exports: comp.exports
      },
      // Other required @xyflow/react properties
      type: 'componentNode'
    })),
    relationships: componentData.relationships.map(rel => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      // Other required @xyflow/react edge properties
      type: 'smoothstep'
    }))
  };
  
  res.json(frontendData);
});


### Route Analyzer Integration Options
Current Issue: There's no RouteVisualizer specified in the frontend_data.md, but we've implemented a comprehensive Route Analyzer.

Options:

Create a New RouteVisualizer Component:
Add a new frontend component specifically for visualizing routes
Define a new interface in frontend_data.md for this component
Example:
typescript
CopyInsert
interface RouteVisualizerProps {
  projectData?: {
    routes: RouteInfo[];
    stats: {
      totalRoutes: number;
      pageRoutes: number;
      apiRoutes: number;
      dynamicRoutes: number;
      pagesRouter: number;
      appRouter: number;
    };
  };
}