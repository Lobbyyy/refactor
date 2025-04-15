import path from 'path';
import { DirectoryNode, scanProjectDirectory } from '../utils/fileSystem';

/**
 * Analyze the structure of a Next.js project
 * @param projectRoot Path to the project root directory
 * @returns A tree structure representing the project
 */
export async function analyzeStructure(projectRoot: string): Promise<{
  name: string;
  structure: DirectoryNode;
}> {
  try {
    // Scan the project directory to build the tree
    const structure = await scanProjectDirectory(projectRoot);
    
    // Add Next.js specific metadata
    annotateNextJsStructure(structure);
    
    return {
      name: path.basename(projectRoot),
      structure,
    };
  } catch (error) {
    console.error('Error analyzing project structure:', error);
    throw error;
  }
}

/**
 * Recursively annotate the directory tree with Next.js specific metadata
 */
function annotateNextJsStructure(node: DirectoryNode): void {
  // Check if this is a Next.js special directory
  if (node.name === 'pages' || node.name === 'app') {
    node.metadata = {
      ...node.metadata,
      isPages: node.name === 'pages',
      isApp: node.name === 'app',
    };
  } else if (node.name === 'components' || node.name === 'ui') {
    node.metadata = {
      ...node.metadata,
      isComponents: true,
    };
  } else if (node.name === 'public') {
    node.metadata = {
      ...node.metadata,
      isPublic: true,
    };
  } else if (node.name === 'styles') {
    node.metadata = {
      ...node.metadata,
      isStyles: true,
    };
  }
  
  // Recursively annotate children
  for (const child of node.children) {
    if (child.type === 'directory') {
      annotateNextJsStructure(child);
    }
  }
}

/**
 * Count files by type in the project
 */
export function countFilesByType(structure: DirectoryNode): {
  components: number;
  pages: number;
  apis: number;
  layouts: number;
  styles: number;
  utils: number;
  total: number;
} {
  const counts = {
    components: 0,
    pages: 0,
    apis: 0,
    layouts: 0,
    styles: 0,
    utils: 0,
    total: 0,
  };
  
  function countRecursive(node: DirectoryNode) {
    for (const child of node.children) {
      if (child.type === 'file') {
        counts.total++;
        
        // Count by file metadata
        if (child.metadata?.isComponent) counts.components++;
        if (child.metadata?.isPage) counts.pages++;
        if (child.path.includes('/api/')) counts.apis++;
        if (child.metadata?.isLayout) counts.layouts++;
        if (['.css', '.scss', '.less', '.styled.ts', '.styled.tsx'].some(ext => child.path.endsWith(ext))) {
          counts.styles++;
        }
        if (child.path.includes('/utils/') || child.path.includes('/lib/') || child.path.includes('/helpers/')) {
          counts.utils++;
        }
      } else if (child.type === 'directory') {
        countRecursive(child);
      }
    }
  }
  
  countRecursive(structure);
  return counts;
}
