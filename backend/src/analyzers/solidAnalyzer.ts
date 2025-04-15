import { FileNode } from '../utils/fileSystem';
import { parseFileFromPath, extractReactComponents, extractTypeDefinitions } from '../utils/parser';
import * as path from 'path';

// Define interfaces for SOLID analysis
export interface SolidIssue {
  id: string;
  principle: 'SRP' | 'OCP' | 'LSP' | 'ISP' | 'DIP';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  filePath: string;
  line?: number;
  recommendation: string;
  codeSnippet?: string;
}

export interface SolidReport {
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

/**
 * Analyze a Next.js project for SOLID principle adherence
 * @param fileData Array of file nodes to analyze
 * @returns SOLID analysis report
 */
export async function analyzeSolid(fileData: FileNode[]): Promise<SolidReport> {
  try {
    // Filter for TypeScript/JavaScript files
    const tsFiles = fileData.filter(file => 
      file.extension === '.ts' || 
      file.extension === '.tsx' || 
      file.extension === '.js' || 
      file.extension === '.jsx'
    );
    
    // Initialize report
    const issues: SolidIssue[] = [];
    let totalComponents = 0;
    
    // Analyze each file
    for (const file of tsFiles) {
      try {
        // Parse the file
        const ast = await parseFileFromPath(file.path);
        
        // Extract React components
        const components = extractReactComponents(ast);
        totalComponents += components.length;
        
        // Extract TypeScript interfaces and types
        const typeDefinitions = extractTypeDefinitions(ast);
        
        // Analyze Single Responsibility Principle (SRP)
        const srpIssues = analyzeSRP(file, components);
        issues.push(...srpIssues);
        
        // Analyze Open-Closed Principle (OCP)
        const ocpIssues = analyzeOCP(file, components, typeDefinitions);
        issues.push(...ocpIssues);
        
        // Analyze Liskov Substitution Principle (LSP)
        const lspIssues = analyzeLSP(file, components, typeDefinitions);
        issues.push(...lspIssues);
        
        // Analyze Interface Segregation Principle (ISP)
        const ispIssues = analyzeISP(file, typeDefinitions);
        issues.push(...ispIssues);
        
        // Analyze Dependency Inversion Principle (DIP)
        const dipIssues = analyzeDIP(file, components);
        issues.push(...dipIssues);
      } catch (error) {
        console.error(`Error analyzing SOLID principles in ${file.path}:`, error);
        // Continue with next file
      }
    }
    
    // Calculate scores
    const scores = calculateScores(issues, tsFiles.length);
    
    // Count critical issues
    const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
    
    return {
      score: scores,
      issues,
      stats: {
        filesAnalyzed: tsFiles.length,
        totalComponents,
        totalIssues: issues.length,
        criticalIssues
      }
    };
  } catch (error) {
    console.error('Error analyzing SOLID principles:', error);
    throw error;
  }
}

/**
 * Analyze Single Responsibility Principle (SRP)
 * A class/component should have only one reason to change
 */
function analyzeSRP(file: FileNode, components: any[]): SolidIssue[] {
  const issues: SolidIssue[] = [];
  
  // Check component size - large components likely violate SRP
  for (const component of components) {
    const componentName = component.id?.name || 'UnnamedComponent';
    const componentSize = getComponentSize(component);
    
    // Large components (over 200 lines) likely violate SRP
    if (componentSize > 200) {
      issues.push({
        id: `srp-large-component-${file.path}-${componentName}`,
        principle: 'SRP',
        severity: 'critical',
        description: `Component ${componentName} is too large (${componentSize} lines) and likely has multiple responsibilities`,
        filePath: file.path,
        recommendation: 'Split this component into smaller, focused components each with a single responsibility',
      });
    } else if (componentSize > 100) {
      issues.push({
        id: `srp-medium-component-${file.path}-${componentName}`,
        principle: 'SRP',
        severity: 'warning',
        description: `Component ${componentName} is moderately large (${componentSize} lines) and may have multiple responsibilities`,
        filePath: file.path,
        recommendation: 'Consider splitting this component into smaller, focused components',
      });
    }
    
    // Check for mixed concerns (e.g., API calls + rendering)
    if (hasMixedConcerns(component)) {
      issues.push({
        id: `srp-mixed-concerns-${file.path}-${componentName}`,
        principle: 'SRP',
        severity: 'warning',
        description: `Component ${componentName} mixes multiple concerns (e.g., data fetching, state management, and UI rendering)`,
        filePath: file.path,
        recommendation: 'Separate concerns by moving data fetching to custom hooks, business logic to separate utilities, and keep components focused on UI rendering',
      });
    }
  }
  
  return issues;
}

/**
 * Analyze Open-Closed Principle (OCP)
 * Software entities should be open for extension but closed for modification
 */
function analyzeOCP(file: FileNode, components: any[], typeDefinitions: any[]): SolidIssue[] {
  const issues: SolidIssue[] = [];
  
  // Check for excessive conditionals - often a sign of OCP violation
  for (const component of components) {
    const componentName = component.id?.name || 'UnnamedComponent';
    
    // Check for switch statements or long if-else chains
    if (hasExcessiveConditionals(component)) {
      issues.push({
        id: `ocp-excessive-conditionals-${file.path}-${componentName}`,
        principle: 'OCP',
        severity: 'warning',
        description: `Component ${componentName} contains excessive conditionals (switch statements or long if-else chains)`,
        filePath: file.path,
        recommendation: 'Replace conditionals with polymorphism or strategy pattern. Consider using a component map or render props pattern.',
      });
    }
    
    // Check for hardcoded values that should be props
    if (hasHardcodedValues(component)) {
      issues.push({
        id: `ocp-hardcoded-values-${file.path}-${componentName}`,
        principle: 'OCP',
        severity: 'info',
        description: `Component ${componentName} contains hardcoded values that should be configurable`,
        filePath: file.path,
        recommendation: 'Extract hardcoded values to props or configuration to make the component more extensible',
      });
    }
  }
  
  return issues;
}

/**
 * Analyze Liskov Substitution Principle (LSP)
 * Subtypes must be substitutable for their base types
 */
function analyzeLSP(file: FileNode, components: any[], typeDefinitions: any[]): SolidIssue[] {
  const issues: SolidIssue[] = [];
  
  // Check for proper prop types inheritance in component hierarchies
  for (const typeDefinition of typeDefinitions) {
    if (typeDefinition.type === 'TSInterfaceDeclaration' && typeDefinition.extends) {
      const interfaceName = typeDefinition.id.name;
      
      // Check if the interface extends another but doesn't maintain substitutability
      if (hasLSPViolation(typeDefinition)) {
        issues.push({
          id: `lsp-interface-violation-${file.path}-${interfaceName}`,
          principle: 'LSP',
          severity: 'warning',
          description: `Interface ${interfaceName} extends a base interface but may violate substitutability`,
          filePath: file.path,
          recommendation: 'Ensure derived interfaces maintain the contract of their base interfaces without strengthening preconditions or weakening postconditions',
        });
      }
    }
  }
  
  return issues;
}

/**
 * Analyze Interface Segregation Principle (ISP)
 * No client should be forced to depend on methods it does not use
 */
function analyzeISP(file: FileNode, typeDefinitions: any[]): SolidIssue[] {
  const issues: SolidIssue[] = [];
  
  // Check for large interfaces that should be split
  for (const typeDefinition of typeDefinitions) {
    if (typeDefinition.type === 'TSInterfaceDeclaration') {
      const interfaceName = typeDefinition.id.name;
      const propertyCount = typeDefinition.body.body.length;
      
      // Large interfaces may violate ISP
      if (propertyCount > 10) {
        issues.push({
          id: `isp-large-interface-${file.path}-${interfaceName}`,
          principle: 'ISP',
          severity: 'warning',
          description: `Interface ${interfaceName} has ${propertyCount} properties which may be too many for a single interface`,
          filePath: file.path,
          recommendation: 'Split large interfaces into smaller, more focused interfaces based on client needs',
        });
      }
      
      // Check for props that are rarely used together
      if (hasUnrelatedProps(typeDefinition)) {
        issues.push({
          id: `isp-unrelated-props-${file.path}-${interfaceName}`,
          principle: 'ISP',
          severity: 'info',
          description: `Interface ${interfaceName} contains properties that seem unrelated and may not be used together`,
          filePath: file.path,
          recommendation: 'Group related properties into separate interfaces and compose them where needed',
        });
      }
    }
  }
  
  return issues;
}

/**
 * Analyze Dependency Inversion Principle (DIP)
 * High-level modules should not depend on low-level modules. Both should depend on abstractions.
 */
function analyzeDIP(file: FileNode, components: any[]): SolidIssue[] {
  const issues: SolidIssue[] = [];
  
  // Check for direct dependencies on concrete implementations
  for (const component of components) {
    const componentName = component.id?.name || 'UnnamedComponent';
    
    // Check for direct API calls or database access
    if (hasDirectExternalDependencies(component)) {
      issues.push({
        id: `dip-direct-dependencies-${file.path}-${componentName}`,
        principle: 'DIP',
        severity: 'warning',
        description: `Component ${componentName} directly depends on external services or APIs`,
        filePath: file.path,
        recommendation: 'Use dependency injection and abstractions (interfaces) instead of concrete implementations. Consider using custom hooks or context for external dependencies.',
      });
    }
    
    // Check for tightly coupled components
    if (hasTightCoupling(component)) {
      issues.push({
        id: `dip-tight-coupling-${file.path}-${componentName}`,
        principle: 'DIP',
        severity: 'warning',
        description: `Component ${componentName} is tightly coupled to other components or services`,
        filePath: file.path,
        recommendation: 'Reduce coupling by depending on interfaces rather than concrete implementations. Use composition over inheritance.',
      });
    }
  }
  
  return issues;
}

/**
 * Calculate SOLID principle scores based on issues
 */
function calculateScores(issues: SolidIssue[], totalFiles: number): SolidReport['score'] {
  // Count issues by principle and severity
  const counts = {
    srp: { info: 0, warning: 0, critical: 0 },
    ocp: { info: 0, warning: 0, critical: 0 },
    lsp: { info: 0, warning: 0, critical: 0 },
    isp: { info: 0, warning: 0, critical: 0 },
    dip: { info: 0, warning: 0, critical: 0 }
  };
  
  for (const issue of issues) {
    counts[issue.principle.toLowerCase() as keyof typeof counts][issue.severity]++;
  }
  
  // Calculate scores (0-100) for each principle
  // Higher score = better adherence to the principle
  const baseScore = 100;
  const penalties = {
    info: 1,
    warning: 3,
    critical: 10
  };
  
  // Calculate individual scores
  const srp = Math.max(0, baseScore - calculatePenalty(counts.srp, totalFiles, penalties));
  const ocp = Math.max(0, baseScore - calculatePenalty(counts.ocp, totalFiles, penalties));
  const lsp = Math.max(0, baseScore - calculatePenalty(counts.lsp, totalFiles, penalties));
  const isp = Math.max(0, baseScore - calculatePenalty(counts.isp, totalFiles, penalties));
  const dip = Math.max(0, baseScore - calculatePenalty(counts.dip, totalFiles, penalties));
  
  // Calculate overall score (weighted average)
  const overall = Math.round((srp + ocp + lsp + isp + dip) / 5);
  
  return {
    srp,
    ocp,
    lsp,
    isp,
    dip,
    overall
  };
}

/**
 * Calculate penalty for a principle based on issues
 */
function calculatePenalty(
  counts: { info: number; warning: number; critical: number },
  totalFiles: number,
  penalties: { info: number; warning: number; critical: number }
): number {
  // Normalize by file count to avoid penalizing larger projects
  const normalizationFactor = Math.max(1, Math.log10(totalFiles));
  
  return (
    (counts.info * penalties.info +
     counts.warning * penalties.warning +
     counts.critical * penalties.critical) / normalizationFactor
  );
}

// Helper functions for SOLID analysis

/**
 * Get the approximate size of a component in lines of code
 */
function getComponentSize(component: any): number {
  // For function declarations and arrow functions, we can estimate size from the node's location data
  if (component.type === 'FunctionDeclaration' || 
      component.type === 'ArrowFunctionExpression' || 
      component.type === 'FunctionExpression') {
    
    if (component.loc) {
      return component.loc.end.line - component.loc.start.line + 1;
    }
  }
  
  // For class declarations
  if (component.type === 'ClassDeclaration' && component.body && component.body.loc) {
    return component.body.loc.end.line - component.body.loc.start.line + 1;
  }
  
  // For variable declarators with function expressions
  if (component.type === 'VariableDeclarator' && component.init) {
    if (component.init.loc) {
      return component.init.loc.end.line - component.init.loc.start.line + 1;
    }
  }
  
  // Default to a moderate size if we can't determine
  return 50;
}

/**
 * Check if a component mixes multiple concerns (e.g., API calls, state management, UI rendering)
 */
function hasMixedConcerns(component: any): boolean {
  let hasApiCalls = false;
  let hasStateManagement = false;
  let hasComplexLogic = false;
  
  // Function to traverse the AST and look for specific patterns
  function traverse(node: any) {
    if (!node) return;
    
    // Check for fetch, axios, or other HTTP client usage (API calls)
    if (node.type === 'CallExpression' && 
        ((node.callee?.name === 'fetch') || 
         (node.callee?.object?.name === 'axios') ||
         (node.callee?.object?.name === 'http') ||
         (node.callee?.property?.name === 'get' || 
          node.callee?.property?.name === 'post' || 
          node.callee?.property?.name === 'put' || 
          node.callee?.property?.name === 'delete'))) {
      hasApiCalls = true;
    }
    
    // Check for useState, useReducer, setState (state management)
    if (node.type === 'CallExpression' && 
        (node.callee?.name === 'useState' || 
         node.callee?.name === 'useReducer' || 
         node.callee?.property?.name === 'setState')) {
      hasStateManagement = true;
    }
    
    // Check for complex logic (multiple if statements, loops, etc.)
    if (node.type === 'IfStatement' || 
        node.type === 'ForStatement' || 
        node.type === 'WhileStatement' || 
        node.type === 'SwitchStatement') {
      hasComplexLogic = true;
    }
    
    // Recursively traverse child nodes
    if (node.body) {
      if (Array.isArray(node.body)) {
        node.body.forEach(traverse);
      } else {
        traverse(node.body);
      }
    }
    
    if (node.consequent) traverse(node.consequent);
    if (node.alternate) traverse(node.alternate);
    if (node.block) traverse(node.block);
    
    if (node.declarations) {
      node.declarations.forEach(traverse);
    }
    
    if (node.init) traverse(node.init);
    if (node.expression) traverse(node.expression);
    
    if (node.arguments) {
      node.arguments.forEach(traverse);
    }
  }
  
  // Start traversal
  traverse(component);
  
  // If the component has at least two of these concerns, it's mixing concerns
  return (hasApiCalls && hasStateManagement) || 
         (hasApiCalls && hasComplexLogic) || 
         (hasStateManagement && hasComplexLogic);
}

/**
 * Check if a component has excessive conditionals (switch statements, if-else chains)
 */
function hasExcessiveConditionals(component: any): boolean {
  let conditionalCount = 0;
  const EXCESSIVE_THRESHOLD = 5; // More than 5 conditionals is excessive
  
  // Function to traverse the AST and count conditionals
  function traverse(node: any) {
    if (!node) return;
    
    // Count if statements, switch statements, and ternary expressions
    if (node.type === 'IfStatement' || 
        node.type === 'SwitchStatement' || 
        node.type === 'ConditionalExpression') {
      conditionalCount++;
    }
    
    // Recursively traverse child nodes
    if (node.body) {
      if (Array.isArray(node.body)) {
        node.body.forEach(traverse);
      } else {
        traverse(node.body);
      }
    }
    
    if (node.consequent) traverse(node.consequent);
    if (node.alternate) traverse(node.alternate);
    if (node.cases) node.cases.forEach(traverse);
    if (node.block) traverse(node.block);
    
    if (node.declarations) {
      node.declarations.forEach(traverse);
    }
    
    if (node.init) traverse(node.init);
    if (node.test) traverse(node.test);
    if (node.update) traverse(node.update);
    if (node.expression) traverse(node.expression);
    
    if (node.arguments) {
      node.arguments.forEach(traverse);
    }
  }
  
  // Start traversal
  traverse(component);
  
  return conditionalCount > EXCESSIVE_THRESHOLD;
}

/**
 * Check if a component has hardcoded values that should be props or config
 */
function hasHardcodedValues(component: any): boolean {
  let hardcodedValueCount = 0;
  const THRESHOLD = 3; // More than 3 hardcoded values is concerning
  
  // Function to traverse the AST and look for hardcoded values
  function traverse(node: any) {
    if (!node) return;
    
    // Check for string literals, number literals, array literals, and object literals
    // that are not in import/export statements or variable declarations
    if ((node.type === 'StringLiteral' || 
         node.type === 'NumericLiteral' || 
         node.type === 'ArrayExpression' || 
         node.type === 'ObjectExpression') && 
        !isInImportExport(node) && 
        !isInVariableDeclaration(node)) {
      hardcodedValueCount++;
    }
    
    // Recursively traverse child nodes
    if (node.body) {
      if (Array.isArray(node.body)) {
        node.body.forEach(traverse);
      } else {
        traverse(node.body);
      }
    }
    
    if (node.consequent) traverse(node.consequent);
    if (node.alternate) traverse(node.alternate);
    if (node.block) traverse(node.block);
    
    if (node.declarations) {
      node.declarations.forEach(traverse);
    }
    
    if (node.init) traverse(node.init);
    if (node.expression) traverse(node.expression);
    
    if (node.arguments) {
      node.arguments.forEach(traverse);
    }
    
    if (node.properties) {
      node.properties.forEach(traverse);
    }
    
    if (node.elements) {
      node.elements.forEach(traverse);
    }
  }
  
  // Helper function to check if a node is part of an import/export statement
  function isInImportExport(node: any): boolean {
    let current = node;
    while (current && current.parent) {
      if (current.parent.type === 'ImportDeclaration' || 
          current.parent.type === 'ExportNamedDeclaration' || 
          current.parent.type === 'ExportDefaultDeclaration') {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
  
  // Helper function to check if a node is part of a variable declaration
  function isInVariableDeclaration(node: any): boolean {
    let current = node;
    while (current && current.parent) {
      if (current.parent.type === 'VariableDeclaration') {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
  
  // Start traversal
  traverse(component);
  
  return hardcodedValueCount > THRESHOLD;
}

/**
 * Check if a TypeScript interface violates the Liskov Substitution Principle
 */
function hasLSPViolation(typeDefinition: any): boolean {
  // If the interface doesn't extend anything, it can't violate LSP
  if (!typeDefinition.extends || typeDefinition.extends.length === 0) {
    return false;
  }
  
  // Look for narrowing of parameter types or widening of return types
  // This is a simplified check - a full implementation would be more complex
  const baseInterfaces = typeDefinition.extends.map((ext: any) => ext.expression.name);
  
  // For each property in the interface, check if it's overriding a property in a base interface
  // and if it's doing so in a way that violates LSP
  for (const member of typeDefinition.body.body) {
    if (member.type === 'TSMethodSignature') {
      // Check if method parameters are more restrictive than base interface
      // or if return type is less restrictive
      // This would require knowledge of the base interface methods
      
      // For this simplified implementation, we'll check if the method has
      // more required parameters than it might in a base interface
      if (member.parameters && member.parameters.length > 2) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a TypeScript interface has unrelated properties that should be split
 */
function hasUnrelatedProps(typeDefinition: any): boolean {
  if (!typeDefinition.body || !typeDefinition.body.body) {
    return false;
  }
  
  const properties = typeDefinition.body.body;
  if (properties.length <= 5) {
    return false; // Small interfaces are likely cohesive
  }
  
  // Group properties by naming patterns
  const uiProps = properties.filter((prop: any) => 
    prop.key && typeof prop.key.name === 'string' && 
    (prop.key.name.includes('style') || 
     prop.key.name.includes('class') || 
     prop.key.name.includes('color') || 
     prop.key.name.includes('size') || 
     prop.key.name.includes('width') || 
     prop.key.name.includes('height'))
  );
  
  const dataProps = properties.filter((prop: any) => 
    prop.key && typeof prop.key.name === 'string' && 
    (prop.key.name.includes('data') || 
     prop.key.name.includes('value') || 
     prop.key.name.includes('item') || 
     prop.key.name.includes('list'))
  );
  
  const eventProps = properties.filter((prop: any) => 
    prop.key && typeof prop.key.name === 'string' && 
    (prop.key.name.includes('on') || 
     prop.key.name.includes('handler') || 
     prop.key.name.includes('callback'))
  );
  
  // If we have multiple property groups with significant size, the interface might be mixing concerns
  const hasMultipleGroups = 
    (uiProps.length >= 2 && dataProps.length >= 2) || 
    (uiProps.length >= 2 && eventProps.length >= 2) || 
    (dataProps.length >= 2 && eventProps.length >= 2);
  
  return hasMultipleGroups;
}

/**
 * Check if a component directly depends on external services or APIs
 */
function hasDirectExternalDependencies(component: any): boolean {
  let hasDirectDependency = false;
  
  // Function to traverse the AST and look for direct API calls
  function traverse(node: any) {
    if (!node) return;
    
    // Check for fetch, axios, or other HTTP client usage
    if (node.type === 'CallExpression') {
      if (node.callee?.name === 'fetch') {
        hasDirectDependency = true;
      } else if (node.callee?.object?.name === 'axios') {
        hasDirectDependency = true;
      } else if (node.callee?.property?.name === 'get' || 
                node.callee?.property?.name === 'post' || 
                node.callee?.property?.name === 'put' || 
                node.callee?.property?.name === 'delete') {
        hasDirectDependency = true;
      }
    }
    
    // Check for database access (e.g., firebase, mongoose, prisma)
    if (node.type === 'MemberExpression' && 
        (node.object?.name === 'firebase' || 
         node.object?.name === 'db' || 
         node.object?.name === 'database' || 
         node.object?.name === 'mongoose' || 
         node.object?.name === 'prisma')) {
      hasDirectDependency = true;
    }
    
    // Recursively traverse child nodes
    if (node.body) {
      if (Array.isArray(node.body)) {
        node.body.forEach(traverse);
      } else {
        traverse(node.body);
      }
    }
    
    if (node.consequent) traverse(node.consequent);
    if (node.alternate) traverse(node.alternate);
    if (node.block) traverse(node.block);
    
    if (node.declarations) {
      node.declarations.forEach(traverse);
    }
    
    if (node.init) traverse(node.init);
    if (node.expression) traverse(node.expression);
    
    if (node.arguments) {
      node.arguments.forEach(traverse);
    }
  }
  
  // Start traversal
  traverse(component);
  
  return hasDirectDependency;
}

/**
 * Check if a component is tightly coupled to other components
 */
function hasTightCoupling(component: any): boolean {
  let importCount = 0;
  let directReferenceCount = 0;
  
  // Function to traverse the AST and look for tight coupling
  function traverse(node: any) {
    if (!node) return;
    
    // Count direct references to other components
    if (node.type === 'JSXElement' && 
        node.openingElement && 
        node.openingElement.name && 
        node.openingElement.name.name && 
        /^[A-Z]/.test(node.openingElement.name.name)) {
      directReferenceCount++;
    }
    
    // Count imports of other components
    if (node.type === 'ImportDeclaration') {
      node.specifiers.forEach((specifier: any) => {
        if (specifier.local && 
            specifier.local.name && 
            /^[A-Z]/.test(specifier.local.name)) {
          importCount++;
        }
      });
    }
    
    // Recursively traverse child nodes
    if (node.body) {
      if (Array.isArray(node.body)) {
        node.body.forEach(traverse);
      } else {
        traverse(node.body);
      }
    }
    
    if (node.consequent) traverse(node.consequent);
    if (node.alternate) traverse(node.alternate);
    if (node.block) traverse(node.block);
    
    if (node.declarations) {
      node.declarations.forEach(traverse);
    }
    
    if (node.init) traverse(node.init);
    if (node.expression) traverse(node.expression);
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  // Start traversal
  traverse(component);
  
  // A component is tightly coupled if it directly references many other components
  return importCount > 5 || directReferenceCount > 7;
}