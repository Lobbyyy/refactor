import path from 'path';
import { FileNode } from '../utils/fileSystem';
import { parseFileFromPath, extractImports, extractExports } from '../utils/parser';

// Define interfaces for dependency analysis
export interface DependencyNode {
  id: string;
  label: string;
  filePath: string;
  type: 'component' | 'page' | 'api' | 'util' | 'hook' | 'lib' | 'config';
  imports: string[];
  exports: string[];
}

export interface CircularDependency {
  path: string[];
  severity: 'warning' | 'critical';
}

export interface DependencyGraph {
  dependencies: DependencyNode[];
  circularDependencies?: CircularDependency[];
}

/**
 * Analyze module dependencies in a Next.js project
 * @param fileData Array of file nodes to analyze
 * @returns Dependency graph with nodes and circular dependencies
 */
export async function analyzeDependencies(fileData: FileNode[]): Promise<DependencyGraph> {
  try {
    // Filter for TypeScript/JavaScript files
    const tsFiles = fileData.filter(file => 
      file.extension === '.ts' || 
      file.extension === '.tsx' || 
      file.extension === '.js' || 
      file.extension === '.jsx'
    );
    
    // Map to store file paths to their module names
    const filePathToModuleName = new Map<string, string>();
    
    // Map to store dependencies between files
    const dependencyMap = new Map<string, Set<string>>();
    
    // Array to store dependency nodes
    const dependencyNodes: DependencyNode[] = [];
    
    // First pass: extract imports and exports from each file
    for (const file of tsFiles) {
      try {
        // Parse the file
        const ast = await parseFileFromPath(file.path);
        
        // Extract imports
        const imports = extractImports(ast);
        const importPaths = new Set<string>();
        
        for (const importDecl of imports) {
          const importPath = importDecl.source.value as string;
          
          // Skip node_modules imports
          if (!importPath.startsWith('.') && !importPath.startsWith('/')) continue;
          
          // Resolve relative import path to absolute path
          const resolvedPath = resolveImportPath(file.path, importPath);
          if (resolvedPath) {
            importPaths.add(resolvedPath);
          }
        }
        
        // Extract exports
        const exports = extractExports(ast);
        const exportNames: string[] = [];
        
        for (const exportDecl of exports) {
          if (exportDecl.type === 'ExportNamedDeclaration' && exportDecl.specifiers) {
            for (const specifier of exportDecl.specifiers) {
              if (specifier.exported && 'name' in specifier.exported) {
                exportNames.push(specifier.exported.name);
              }
            }
          } else if (exportDecl.type === 'ExportDefaultDeclaration') {
            exportNames.push('default');
          }
        }
        
        // Determine file type
        let type: DependencyNode['type'] = 'util';
        if (file.metadata?.isPage) {
          type = 'page';
        } else if (file.metadata?.isComponent) {
          type = 'component';
        } else if (file.path.includes('/api/')) {
          type = 'api';
        } else if (file.path.includes('/hooks/') || path.basename(file.path, path.extname(file.path)).startsWith('use')) {
          type = 'hook';
        } else if (file.path.includes('/lib/')) {
          type = 'lib';
        } else if (file.path.includes('/config/')) {
          type = 'config';
        }
        
        // Create dependency node
        const fileName = path.basename(file.path);
        const dependencyNode: DependencyNode = {
          id: file.path,
          label: fileName,
          filePath: file.path,
          type,
          imports: Array.from(importPaths),
          exports: exportNames
        };
        
        dependencyNodes.push(dependencyNode);
        
        // Store in maps for circular dependency detection
        filePathToModuleName.set(file.path, fileName);
        dependencyMap.set(file.path, importPaths);
      } catch (error) {
        console.error(`Error analyzing dependencies in ${file.path}:`, error);
        // Continue with next file
      }
    }
    
    // Detect circular dependencies
    const circularDependencies = detectCircularDependencies(dependencyMap, filePathToModuleName);
    
    return {
      dependencies: dependencyNodes,
      circularDependencies
    };
  } catch (error) {
    console.error('Error analyzing dependencies:', error);
    throw error;
  }
}

/**
 * Resolve a relative import path to an absolute file path
 */
function resolveImportPath(sourcePath: string, importPath: string): string | null {
  try {
    // Get directory of the source file
    const sourceDir = path.dirname(sourcePath);
    
    // Resolve the import path relative to the source directory
    let resolvedPath = path.resolve(sourceDir, importPath);
    
    // Check if the import has a file extension
    if (!path.extname(resolvedPath)) {
      // Try common extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const pathWithExt = resolvedPath + ext;
        // In a real implementation, we would check if this file exists
        // For now, we'll just return the first possibility
        return pathWithExt;
      }
      
      // If no extension works, try index files
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, `index${ext}`);
        // In a real implementation, we would check if this file exists
        return indexPath; // Return the first possibility
      }
    }
    
    return resolvedPath;
  } catch (error) {
    console.error(`Error resolving import path ${importPath} from ${sourcePath}:`, error);
    return null;
  }
}

/**
 * Detect circular dependencies in the dependency graph
 */
function detectCircularDependencies(
  dependencyMap: Map<string, Set<string>>,
  filePathToModuleName: Map<string, string>
): CircularDependency[] {
  const circularDependencies: CircularDependency[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  
  function dfs(node: string, path: string[] = []): void {
    // Skip if already fully explored
    if (visited.has(node)) return;
    
    // Check for circular dependency
    if (stack.has(node)) {
      // Found a cycle
      const cycleStart = path.findIndex(p => p === node);
      if (cycleStart >= 0) {
        const cycle = path.slice(cycleStart).map(p => filePathToModuleName.get(p) || p);
        
        // Determine severity based on cycle length
        const severity = cycle.length > 3 ? 'critical' : 'warning';
        
        circularDependencies.push({
          path: cycle,
          severity
        });
      }
      return;
    }
    
    // Mark as being explored
    stack.add(node);
    path.push(node);
    
    // Explore dependencies
    const dependencies = dependencyMap.get(node) || new Set<string>();
    for (const dependency of dependencies) {
      dfs(dependency, [...path]);
    }
    
    // Mark as fully explored
    stack.delete(node);
    visited.add(node);
  }
  
  // Run DFS from each node
  for (const node of dependencyMap.keys()) {
    dfs(node);
  }
  
  return circularDependencies;
}

/**
 * Generate a Mermaid.js diagram of the dependency graph
 */
export function generateDependencyDiagram(graph: DependencyGraph): string {
  const { dependencies, circularDependencies } = graph;
  
  // Start Mermaid flowchart
  let diagram = 'graph TD;\n';
  
  // Add nodes
  for (const node of dependencies) {
    const nodeId = `node_${node.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const nodeStyle = getNodeStyle(node.type);
    diagram += `  ${nodeId}["${node.label}"]${nodeStyle};\n`;
  }
  
  // Add edges
  const processedEdges = new Set<string>();
  for (const node of dependencies) {
    const sourceId = `node_${node.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    for (const importPath of node.imports) {
      const targetNode = dependencies.find(d => d.id === importPath);
      if (targetNode) {
        const targetId = `node_${targetNode.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const edgeId = `${sourceId}->${targetId}`;
        
        // Skip if already processed
        if (processedEdges.has(edgeId)) continue;
        processedEdges.add(edgeId);
        
        // Check if this is part of a circular dependency
        let edgeStyle = '';
        if (circularDependencies) {
          for (const cycle of circularDependencies) {
            const nodeName = node.label;
            const targetName = targetNode.label;
            if (
              cycle.path.includes(nodeName) && 
              cycle.path.includes(targetName) &&
              (
                cycle.path.indexOf(nodeName) === (cycle.path.indexOf(targetName) + 1) % cycle.path.length ||
                cycle.path.indexOf(targetName) === (cycle.path.indexOf(nodeName) + 1) % cycle.path.length
              )
            ) {
              edgeStyle = cycle.severity === 'critical' ? ' style="stroke: red; stroke-width: 2px;"' : ' style="stroke: orange; stroke-width: 1.5px;"';
              break;
            }
          }
        }
        
        diagram += `  ${sourceId} --> ${targetId}${edgeStyle};\n`;
      }
    }
  }
  
  return diagram;
}

/**
 * Get Mermaid.js style for a node based on its type
 */
function getNodeStyle(type: DependencyNode['type']): string {
  switch (type) {
    case 'component':
      return ' class="component"';
    case 'page':
      return ' class="page"';
    case 'api':
      return ' class="api"';
    case 'hook':
      return ' class="hook"';
    case 'lib':
      return ' class="lib"';
    case 'config':
      return ' class="config"';
    default:
      return ' class="util"';
  }
}