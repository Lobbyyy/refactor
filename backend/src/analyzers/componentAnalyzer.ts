import { FileNode } from '../utils/fileSystem';
import { parseFileFromPath, extractReactComponents, extractComponentProps, extractImports } from '../utils/parser';

// Define interfaces for component analysis
export interface ComponentNodeData {
  id: string;
  label: string;
  filePath: string;
  type: 'component' | 'page' | 'layout' | 'utils' | 'hook';
  props?: string[];
  imports?: number;
  exports?: number;
  position?: { x: number; y: number };
}

export interface ComponentRelationship {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ComponentGraph {
  components: ComponentNodeData[];
  relationships: ComponentRelationship[];
}

/**
 * Analyze React components in a Next.js project
 * @param fileData Array of file nodes to analyze
 * @returns Component graph with nodes and relationships
 */
export async function analyzeComponents(fileData: FileNode[]): Promise<ComponentGraph> {
  try {
    // Filter for TypeScript/JavaScript files that might contain components
    const tsxFiles = fileData.filter(file => 
      file.extension === '.tsx' || 
      file.extension === '.jsx' || 
      file.extension === '.js' || 
      file.extension === '.ts'
    );
    
    // Extract component information from each file
    const componentNodes: ComponentNodeData[] = [];
    const importMap = new Map<string, string[]>(); // Maps file paths to imported components
    
    // First pass: identify all components
    for (const file of tsxFiles) {
      try {
        // Parse the file
        const ast = await parseFileFromPath(file.path);
        
        // Extract React components
        const components = extractReactComponents(ast);
        
        if (components.length > 0) {
          // For each component in the file
          for (const component of components) {
            // Get component name
            let componentName = '';
            if (component.type === 'FunctionDeclaration' || component.type === 'ClassDeclaration') {
              componentName = component.id?.name || '';
            } else if (component.type === 'VariableDeclarator' && component.id.type === 'Identifier') {
              componentName = component.id.name || '';
            }
            
            if (componentName) {
              // Extract props
              const props = extractComponentProps(component);
              
              // Determine component type
              let type: ComponentNodeData['type'] = 'component';
              if (file.metadata?.isPage) {
                type = 'page';
              } else if (file.metadata?.isLayout) {
                type = 'layout';
              } else if (file.path.includes('/hooks/') || componentName.startsWith('use')) {
                type = 'hook';
              } else if (file.path.includes('/utils/') || file.path.includes('/lib/') || file.path.includes('/helpers/')) {
                type = 'utils';
              }
              
              // Create component node
              const componentNode: ComponentNodeData = {
                id: `${file.path}:${componentName}`,
                label: componentName,
                filePath: file.path,
                type,
                props: props.length > 0 ? props : undefined,
                imports: 0, // Will be updated in second pass
                exports: 0, // Will be updated in second pass
                // Position will be calculated later for visualization
              };
              
              componentNodes.push(componentNode);
            }
          }
        }
        
        // Extract imports for relationship mapping
        const imports = extractImports(ast);
        const importedComponents: string[] = [];
        
        for (const importDecl of imports) {
          // Only consider local imports (not from node_modules)
          if (!importDecl.source.value.startsWith('.')) continue;
          
          // Extract imported component names
          for (const specifier of importDecl.specifiers) {
            if (specifier.type === 'ImportSpecifier' || specifier.type === 'ImportDefaultSpecifier') {
              const importedName = specifier.local.name;
              if (/^[A-Z]/.test(importedName)) { // Likely a component if it starts with uppercase
                importedComponents.push(importedName);
              }
            }
          }
        }
        
        // Store imported components for this file
        if (importedComponents.length > 0) {
          importMap.set(file.path, importedComponents);
        }
      } catch (error) {
        console.error(`Error analyzing components in ${file.path}:`, error);
        // Continue with next file
      }
    }
    
    // Second pass: build relationships between components
    const relationships: ComponentRelationship[] = [];
    
    for (const [filePath, importedComponents] of importMap.entries()) {
      // Find components defined in this file
      const sourceComponents = componentNodes.filter(node => node.filePath === filePath);
      
      if (sourceComponents.length === 0) continue;
      
      // For each imported component name, find matching component nodes
      for (const importedName of importedComponents) {
        const targetComponents = componentNodes.filter(node => node.label === importedName);
        
        // Create relationships from source components to target components
        for (const sourceComponent of sourceComponents) {
          for (const targetComponent of targetComponents) {
            // Skip self-references
            if (sourceComponent.id === targetComponent.id) continue;
            
            const relationship: ComponentRelationship = {
              id: `${sourceComponent.id}->${targetComponent.id}`,
              source: sourceComponent.id,
              target: targetComponent.id,
            };
            
            relationships.push(relationship);
            
            // Update import/export counts
            sourceComponent.imports = (sourceComponent.imports || 0) + 1;
            targetComponent.exports = (targetComponent.exports || 0) + 1;
          }
        }
      }
    }
    
    // Calculate positions for visualization (simple grid layout)
    const gridSize = Math.ceil(Math.sqrt(componentNodes.length));
    const spacing = 150;
    
    componentNodes.forEach((node, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      node.position = {
        x: col * spacing,
        y: row * spacing
      };
    });
    
    return {
      components: componentNodes,
      relationships
    };
  } catch (error) {
    console.error('Error analyzing components:', error);
    throw error;
  }
}

/**
 * Get component usage statistics
 */
export function getComponentStats(graph: ComponentGraph): {
  totalComponents: number;
  byType: Record<string, number>;
  mostUsed: Array<{ name: string; usageCount: number }>;
  mostProps: Array<{ name: string; propCount: number }>;
} {
  const { components, relationships } = graph;
  
  // Count components by type
  const byType: Record<string, number> = {
    component: 0,
    page: 0,
    layout: 0,
    utils: 0,
    hook: 0
  };
  
  components.forEach(component => {
    byType[component.type] = (byType[component.type] || 0) + 1;
  });
  
  // Find most used components (by import count)
  const componentUsage = new Map<string, number>();
  
  relationships.forEach(rel => {
    const targetId = rel.target;
    componentUsage.set(targetId, (componentUsage.get(targetId) || 0) + 1);
  });
  
  const mostUsed = Array.from(componentUsage.entries())
    .map(([id, count]) => {
      const component = components.find(c => c.id === id);
      return {
        name: component?.label || id,
        usageCount: count
      };
    })
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);
  
  // Find components with most props
  const mostProps = components
    .filter(c => c.props && c.props.length > 0)
    .map(c => ({
      name: c.label,
      propCount: c.props?.length || 0
    }))
    .sort((a, b) => b.propCount - a.propCount)
    .slice(0, 5);
  
  return {
    totalComponents: components.length,
    byType,
    mostUsed,
    mostProps
  };
}
