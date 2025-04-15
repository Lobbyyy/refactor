import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Define interfaces for file and directory nodes
export interface FileNode {
  name: string;
  path: string;
  type: 'file';
  size?: number;
  extension?: string;
  content?: string;
  metadata?: {
    imports?: number;
    exports?: number;
    isPage?: boolean;
    isComponent?: boolean;
    isLayout?: boolean;
  };
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'directory';
  children: (FileNode | DirectoryNode)[];
  metadata?: {
    fileCount?: number;
    isPages?: boolean;
    isApp?: boolean;
    isComponents?: boolean;
    isPublic?: boolean;
    isStyles?: boolean;
  };
}

// File extensions to include in the analysis
const INCLUDE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];

// Directories to exclude from the analysis
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'out'];

/**
 * Recursively scan a project directory and return a tree structure
 */
export async function scanProjectDirectory(projectRoot: string): Promise<DirectoryNode> {
  const rootName = path.basename(projectRoot);
  const rootNode: DirectoryNode = {
    name: rootName,
    path: projectRoot,
    type: 'directory',
    children: [],
  };

  try {
    await buildDirectoryTree(rootNode, projectRoot);
    return rootNode;
  } catch (error) {
    console.error('Error scanning project directory:', error);
    throw error;
  }
}

/**
 * Recursively build a directory tree
 */
async function buildDirectoryTree(node: DirectoryNode, dirPath: string): Promise<void> {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    // Process all entries
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      // Skip excluded directories
      if (entry.isDirectory() && EXCLUDE_DIRS.includes(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Create directory node
        const dirNode: DirectoryNode = {
          name: entry.name,
          path: entryPath,
          type: 'directory',
          children: [],
          metadata: {
            isPages: entry.name === 'pages',
            isApp: entry.name === 'app',
            isComponents: entry.name === 'components',
          }
        };
        
        // Recursively build tree for this directory
        await buildDirectoryTree(dirNode, entryPath);
        
        // Add file count metadata
        const fileCount = countFiles(dirNode);
        dirNode.metadata = { ...dirNode.metadata, fileCount };
        
        // Add to parent's children
        node.children.push(dirNode);
      } else if (entry.isFile()) {
        // Only include files with specified extensions
        const ext = path.extname(entry.name);
        if (INCLUDE_EXTENSIONS.includes(ext)) {
          const fileNode = await createFileNode(entryPath);
          node.children.push(fileNode);
        }
      }
    }
    
    // Sort children (directories first, then files)
    node.children.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Create a file node with metadata
 */
async function createFileNode(filePath: string): Promise<FileNode> {
  try {
    const stats = await fs.promises.stat(filePath);
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath);
    
    // Basic file node
    const fileNode: FileNode = {
      name: fileName,
      path: filePath,
      type: 'file',
      size: stats.size,
      extension: ext,
      metadata: {
        isPage: isNextPage(filePath),
        isComponent: isReactComponent(filePath),
        isLayout: fileName === 'layout.tsx' || fileName === 'layout.jsx',
      }
    };
    
    return fileNode;
  } catch (error) {
    console.error(`Error creating file node for ${filePath}:`, error);
    throw error;
  }
}

/**
 * Count the total number of files in a directory tree
 */
function countFiles(node: DirectoryNode): number {
  let count = 0;
  for (const child of node.children) {
    if (child.type === 'file') {
      count++;
    } else {
      count += countFiles(child);
    }
  }
  return count;
}

/**
 * Check if a file is a Next.js page
 */
function isNextPage(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (!['.tsx', '.jsx', '.js', '.ts'].includes(ext)) return false;
  
  // Check if file is in pages or app directory
  const normalizedPath = filePath.replace(/\\/g, '/');
  return (
    normalizedPath.includes('/pages/') || 
    (normalizedPath.includes('/app/') && !normalizedPath.includes('/components/'))
  );
}

/**
 * Check if a file is likely a React component
 */
function isReactComponent(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (!['.tsx', '.jsx'].includes(ext)) return false;
  
  // Components typically start with uppercase letter
  const fileName = path.basename(filePath, ext);
  return /^[A-Z]/.test(fileName) || fileName === 'index';
}

/**
 * Read file content
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Find all files matching a pattern
 */
export async function findFiles(projectRoot: string, pattern: string): Promise<string[]> {
  try {
    // Use glob to find files matching pattern
    const files = await glob(pattern, {
      cwd: projectRoot,
      ignore: EXCLUDE_DIRS.map(dir => `**/${dir}/**`),
      absolute: true,
    });
    
    return files;
  } catch (error) {
    console.error(`Error finding files with pattern ${pattern}:`, error);
    throw error;
  }
}

/**
 * Read all project files matching specified extensions
 */
export async function readProjectFiles(projectRoot: string): Promise<FileNode[]> {
  try {
    const filePatterns = INCLUDE_EXTENSIONS.map(ext => `**/*${ext}`);
    const filePaths = await findFiles(projectRoot, `{${filePatterns.join(',')}}`);
    
    const fileNodes: FileNode[] = [];
    for (const filePath of filePaths) {
      const fileNode = await createFileNode(filePath);
      fileNodes.push(fileNode);
    }
    
    return fileNodes;
  } catch (error) {
    console.error('Error reading project files:', error);
    throw error;
  }
}
