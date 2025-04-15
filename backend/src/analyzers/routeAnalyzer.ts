import path from 'path';
import { DirectoryNode, FileNode } from '../utils/fileSystem';

// Define interfaces for route analysis
export interface RouteInfo {
  id: string;
  path: string; // URL path
  filePath: string; // File system path
  componentName?: string;
  isDynamic: boolean;
  isApi: boolean;
  isPage: boolean;
  routerType: 'pages' | 'app';
  params?: string[];
  children?: RouteInfo[];
}

export interface RouteMap {
  routes: RouteInfo[];
  stats: {
    totalRoutes: number;
    pageRoutes: number;
    apiRoutes: number;
    dynamicRoutes: number;
    pagesRouter: number;
    appRouter: number;
  };
}

/**
 * Analyze Next.js routes in a project
 * @param structure Directory structure from Structure Analyzer
 * @returns Route map with route information and statistics
 */
export function analyzeRoutes(structure: DirectoryNode): RouteMap {
  try {
    const routes: RouteInfo[] = [];
    const stats = {
      totalRoutes: 0,
      pageRoutes: 0,
      apiRoutes: 0,
      dynamicRoutes: 0,
      pagesRouter: 0,
      appRouter: 0,
    };
    
    // Find pages and app directories
    const pagesDir = findDirectory(structure, 'pages');
    const appDir = findDirectory(structure, 'app');
    
    // Process Pages Router routes
    if (pagesDir) {
      const pagesRoutes = processPageDirectory(pagesDir, '');
      routes.push(...pagesRoutes);
      
      // Update stats
      stats.pagesRouter = pagesRoutes.length;
      stats.totalRoutes += pagesRoutes.length;
      stats.pageRoutes += pagesRoutes.filter(r => !r.isApi).length;
      stats.apiRoutes += pagesRoutes.filter(r => r.isApi).length;
      stats.dynamicRoutes += pagesRoutes.filter(r => r.isDynamic).length;
    }
    
    // Process App Router routes
    if (appDir) {
      const appRoutes = processAppDirectory(appDir, '');
      routes.push(...appRoutes);
      
      // Update stats
      stats.appRouter = appRoutes.length;
      stats.totalRoutes += appRoutes.length;
      stats.pageRoutes += appRoutes.filter(r => !r.isApi).length;
      stats.apiRoutes += appRoutes.filter(r => r.isApi).length;
      stats.dynamicRoutes += appRoutes.filter(r => r.isDynamic).length;
    }
    
    return { routes, stats };
  } catch (error) {
    console.error('Error analyzing routes:', error);
    throw error;
  }
}

/**
 * Find a directory by name in the structure
 */
function findDirectory(node: DirectoryNode, name: string): DirectoryNode | null {
  if (node.name === name) {
    return node;
  }
  
  for (const child of node.children) {
    if (child.type === 'directory') {
      const found = findDirectory(child, name);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Process Pages Router directory
 */
function processPageDirectory(dir: DirectoryNode, basePath: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  
  for (const child of dir.children) {
    const relativePath = path.join(basePath, child.name);
    
    if (child.type === 'file') {
      // Skip non-page files
      const ext = path.extname(child.name);
      if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) continue;
      
      // Skip files that start with underscore (e.g., _app.js, _document.js)
      const baseName = path.basename(child.name, ext);
      if (baseName.startsWith('_')) continue;
      
      // Handle index files
      let routePath = relativePath;
      if (baseName === 'index') {
        routePath = basePath;
      }
      
      // Handle API routes
      const isApi = relativePath.startsWith('api/') || relativePath.includes('/api/');
      
      // Check for dynamic route segments
      const segments = routePath.split('/');
      const params: string[] = [];
      const processedSegments = segments.map(segment => {
        // Handle [...slug] or [[...slug]] catch-all routes
        if (segment.startsWith('[...') && segment.endsWith(']')) {
          const param = segment.slice(4, -1);
          params.push(param);
          return `*`; // Catch-all route
        }
        // Handle [[...slug]] optional catch-all routes
        else if (segment.startsWith('[[...') && segment.endsWith(']]')) {
          const param = segment.slice(5, -2);
          params.push(param);
          return `*?`; // Optional catch-all route
        }
        // Handle [slug] dynamic routes
        else if (segment.startsWith('[') && segment.endsWith(']')) {
          const param = segment.slice(1, -1);
          params.push(param);
          return `:${param}`;
        }
        return segment;
      });
      
      const isDynamic = params.length > 0;
      const routeId = `pages:${routePath}`;
      
      routes.push({
        id: routeId,
        path: '/' + processedSegments.join('/'),
        filePath: child.path,
        isDynamic,
        isApi,
        isPage: !isApi,
        routerType: 'pages',
        params: params.length > 0 ? params : undefined,
      });
    } else if (child.type === 'directory') {
      // Recursively process subdirectories
      const childRoutes = processPageDirectory(child, relativePath);
      routes.push(...childRoutes);
    }
  }
  
  return routes;
}

/**
 * Process App Router directory
 */
function processAppDirectory(dir: DirectoryNode, basePath: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  let hasPage = false;
  let hasRoute = false;
  let hasLayout = false;
  
  // First pass: check for page.js, route.js, or layout.js
  for (const child of dir.children) {
    if (child.type === 'file') {
      const fileName = path.basename(child.name, path.extname(child.name));
      if (fileName === 'page') hasPage = true;
      if (fileName === 'route') hasRoute = true;
      if (fileName === 'layout') hasLayout = true;
    }
  }
  
  // Create route for this directory if it has a page or route file
  if (hasPage || hasRoute) {
    // Check for dynamic route segments
    const segments = basePath.split('/');
    const params: string[] = [];
    const processedSegments = segments.map(segment => {
      // Handle [...slug] catch-all routes
      if (segment.startsWith('(...)')) {
        const param = segment.slice(5, -1);
        params.push(param);
        return `*`; // Catch-all route
      }
      // Handle dynamic routes with (folder) syntax
      else if (segment.startsWith('(') && segment.endsWith(')')) {
        return ''; // Route group - doesn't affect URL
      }
      // Handle [slug] dynamic routes
      else if (segment.startsWith('[') && segment.endsWith(']')) {
        const param = segment.slice(1, -1);
        params.push(param);
        return `:${param}`;
      }
      return segment;
    }).filter(Boolean); // Remove empty segments (route groups)
    
    const isDynamic = params.length > 0;
    const isApi = hasRoute; // route.js files are typically API routes
    const routeId = `app:${basePath}`;
    
    routes.push({
      id: routeId,
      path: '/' + processedSegments.join('/'),
      filePath: dir.path,
      isDynamic,
      isApi,
      isPage: !isApi,
      routerType: 'app',
      params: params.length > 0 ? params : undefined,
    });
  }
  
  // Recursively process subdirectories
  for (const child of dir.children) {
    if (child.type === 'directory') {
      const relativePath = path.join(basePath, child.name);
      const childRoutes = processAppDirectory(child, relativePath);
      routes.push(...childRoutes);
    }
  }
  
  return routes;
}

/**
 * Find page files in a directory structure
 */
export function findPageFiles(structure: DirectoryNode): FileNode[] {
  const pageFiles: FileNode[] = [];
  
  function traverse(node: DirectoryNode) {
    for (const child of node.children) {
      if (child.type === 'file') {
        const ext = path.extname(child.name);
        if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) continue;
        
        // Check if file is in pages or app directory
        const isPage = child.metadata?.isPage || 
                       child.path.includes('/pages/') || 
                       (child.path.includes('/app/') && path.basename(child.name, ext) === 'page');
        
        if (isPage) {
          pageFiles.push(child);
        }
      } else if (child.type === 'directory') {
        traverse(child);
      }
    }
  }
  
  traverse(structure);
  return pageFiles;
}
