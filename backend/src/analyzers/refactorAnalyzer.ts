import { FileNode } from '../utils/fileSystem';
import { SolidIssue } from './solidAnalyzer';
import { CircularDependency } from './dependencyAnalyzer';
import path from 'path';

// Define interfaces for refactoring analysis
export interface RefactorSuggestion {
  id: string;
  title: string;
  description: string;
  filePath: string;
  line?: number;
  priority: 'low' | 'medium' | 'high';
  effort: 'easy' | 'medium' | 'hard';
  impact: 'low' | 'medium' | 'high';
  type: 'performance' | 'maintainability' | 'security' | 'accessibility' | 'best-practice';
  codeSnippet?: string;
  suggestedFix?: string;
}

export interface RefactorReport {
  suggestions: RefactorSuggestion[];
  stats: {
    totalSuggestions: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
    byType: {
      performance: number;
      maintainability: number;
      security: number;
      accessibility: number;
      'best-practice': number;
    };
  };
}

/**
 * Generate refactoring suggestions based on analysis results
 * @param fileData Array of file nodes
 * @param solidIssues SOLID principle issues from SOLID analyzer
 * @param circularDependencies Circular dependencies from Dependency analyzer
 * @returns Refactoring report with suggestions
 */
export function generateRefactorSuggestions(
  fileData: FileNode[],
  solidIssues: SolidIssue[] = [],
  circularDependencies: CircularDependency[] = []
): RefactorReport {
  const suggestions: RefactorSuggestion[] = [];
  
  // Convert SOLID issues to refactor suggestions
  const solidSuggestions = convertSolidIssuesToSuggestions(solidIssues);
  suggestions.push(...solidSuggestions);
  
  // Generate suggestions for circular dependencies
  const circularDependencySuggestions = generateCircularDependencySuggestions(circularDependencies);
  suggestions.push(...circularDependencySuggestions);
  
  // Analyze large files
  const largeFileSuggestions = analyzeLargeFiles(fileData);
  suggestions.push(...largeFileSuggestions);
  
  // Analyze file organization
  const organizationSuggestions = analyzeFileOrganization(fileData);
  suggestions.push(...organizationSuggestions);
  
  // Calculate statistics
  const stats = calculateStats(suggestions);
  
  return {
    suggestions,
    stats
  };
}

/**
 * Convert SOLID issues to refactor suggestions
 */
function convertSolidIssuesToSuggestions(solidIssues: SolidIssue[]): RefactorSuggestion[] {
  return solidIssues.map(issue => {
    // Map severity to priority
    const priority: RefactorSuggestion['priority'] = 
      issue.severity === 'critical' ? 'high' :
      issue.severity === 'warning' ? 'medium' : 'low';
    
    // Map principle to type and effort
    let type: RefactorSuggestion['type'] = 'maintainability';
    let effort: RefactorSuggestion['effort'] = 'medium';
    
    switch (issue.principle) {
      case 'SRP':
        type = 'maintainability';
        effort = issue.severity === 'critical' ? 'hard' : 'medium';
        break;
      case 'OCP':
        type = 'maintainability';
        effort = 'medium';
        break;
      case 'LSP':
        type = 'best-practice';
        effort = 'medium';
        break;
      case 'ISP':
        type = 'best-practice';
        effort = 'easy';
        break;
      case 'DIP':
        type = 'maintainability';
        effort = 'hard';
        break;
    }
    
    return {
      id: `refactor-${issue.id}`,
      title: `Fix ${issue.principle} Issue: ${issue.description.split(':')[0]}`,
      description: issue.description,
      filePath: issue.filePath,
      line: issue.line,
      priority,
      effort,
      impact: priority, // Impact generally correlates with priority
      type,
      codeSnippet: issue.codeSnippet,
      suggestedFix: issue.recommendation
    };
  });
}

/**
 * Generate suggestions for circular dependencies
 */
function generateCircularDependencySuggestions(circularDependencies: CircularDependency[]): RefactorSuggestion[] {
  return circularDependencies.map((dependency, index) => {
    const priority: RefactorSuggestion['priority'] = 
      dependency.severity === 'critical' ? 'high' : 'medium';
    
    const pathString = dependency.path.join(' → ');
    
    return {
      id: `refactor-circular-dependency-${index}`,
      title: `Break Circular Dependency: ${pathString}`,
      description: `Circular dependency detected between modules: ${pathString}`,
      filePath: '', // No specific file path for circular dependencies
      priority,
      effort: 'medium',
      impact: 'high',
      type: 'maintainability',
      suggestedFix: 'Consider introducing an abstraction layer or restructuring the modules to break the circular dependency. Extract common functionality to a shared module that both can depend on.'
    };
  });
}

/**
 * Analyze large files and suggest splitting them
 */
function analyzeLargeFiles(fileData: FileNode[]): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];
  
  for (const file of fileData) {
    // Skip non-code files
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(file.extension || '')) continue;
    
    // Check file size (in bytes)
    if (file.size && file.size > 10000) { // 10KB is large for a single file
      suggestions.push({
        id: `refactor-large-file-${file.path}`,
        title: `Split Large File: ${file.name}`,
        description: `File ${file.name} is too large (${Math.round(file.size / 1024)} KB) and may be difficult to maintain.`,
        filePath: file.path,
        priority: 'medium',
        effort: 'medium',
        impact: 'medium',
        type: 'maintainability',
        suggestedFix: 'Consider splitting this file into smaller, more focused modules. Look for logical groupings of functionality that can be extracted.'
      });
    }
  }
  
  return suggestions;
}

/**
 * Analyze file organization and suggest improvements
 */
function analyzeFileOrganization(fileData: FileNode[]): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];
  
  // Check for component files outside of components directory
  const componentFiles = fileData.filter(file => 
    (file.extension === '.tsx' || file.extension === '.jsx') && 
    file.metadata?.isComponent && 
    !file.path.includes('/components/') && 
    !file.path.includes('/pages/') && 
    !file.path.includes('/app/')
  );
  
  if (componentFiles.length > 0) {
    suggestions.push({
      id: 'refactor-organize-components',
      title: 'Organize Components',
      description: `Found ${componentFiles.length} component files outside of a components directory.`,
      filePath: '',
      priority: 'low',
      effort: 'easy',
      impact: 'medium',
      type: 'best-practice',
      suggestedFix: 'Move component files to a dedicated components directory to improve code organization and discoverability.'
    });
  }
  
  // Check for utility files outside of utils directory
  const utilityFiles = fileData.filter(file => 
    (file.extension === '.ts' || file.extension === '.js') && 
    !file.metadata?.isComponent && 
    !file.metadata?.isPage && 
    !file.path.includes('/utils/') && 
    !file.path.includes('/helpers/') && 
    !file.path.includes('/lib/')
  );
  
  if (utilityFiles.length > 3) { // Only suggest if there are several utility files
    suggestions.push({
      id: 'refactor-organize-utilities',
      title: 'Organize Utility Functions',
      description: `Found ${utilityFiles.length} utility files outside of a utils directory.`,
      filePath: '',
      priority: 'low',
      effort: 'easy',
      impact: 'medium',
      type: 'best-practice',
      suggestedFix: 'Move utility functions to a dedicated utils or helpers directory to improve code organization and reusability.'
    });
  }
  
  return suggestions;
}

/**
 * Calculate statistics for suggestions
 */
function calculateStats(suggestions: RefactorSuggestion[]): RefactorReport['stats'] {
  const byPriority = {
    high: 0,
    medium: 0,
    low: 0
  };
  
  const byType = {
    performance: 0,
    maintainability: 0,
    security: 0,
    accessibility: 0,
    'best-practice': 0
  };
  
  for (const suggestion of suggestions) {
    byPriority[suggestion.priority]++;
    byType[suggestion.type]++;
  }
  
  return {
    totalSuggestions: suggestions.length,
    byPriority,
    byType
  };
}