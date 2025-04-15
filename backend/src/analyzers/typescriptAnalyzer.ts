// typescriptAnalyzer.ts
import { FileNode } from '../utils/fileSystem';
import * as parser from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { parseFileFromPath, extractTypeDefinitions } from '../utils/parser';
import path from 'path';

// Define interfaces for TypeScript analysis
export interface TypeInfo {
  id: string;
  name: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  filePath: string;
  properties?: TypeProperty[];
  extends?: string[];
  implements?: string[];
  exported: boolean;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface TypeProperty {
  name: string;
  type: string;
  optional: boolean;
  readonly?: boolean;
}

export interface TypeUsage {
  typeId: string;
  filePath: string;
  count: number;
  locations: Array<{ line: number; column: number }>;
}

export interface TypeIssue {
  id: string;
  kind: 'any' | 'unknown' | 'unused' | 'circular' | 'complex' | 'inconsistent';
  severity: 'info' | 'warning' | 'error';
  message: string;
  filePath: string;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  suggestion?: string;
}

export interface TypeAnalysis {
  types: TypeInfo[];
  usages: TypeUsage[];
  issues: TypeIssue[];
  stats: {
    totalTypes: number;
    interfaces: number;
    typeAliases: number;
    enums: number;
    classes: number;
    coverage: number; // percentage of variables/params with types
    anyUsage: number;
    issueCount: number;
  };
  typeHierarchy: {
    [typeName: string]: string[]; // typeName -> extended/implemented types
  };
}

/**
 * Analyze TypeScript types in a project
 * @param fileData Array of file nodes
 * @returns Type analysis results
 */
export async function analyzeTypes(fileData: FileNode[]): Promise<TypeAnalysis> {
  // Initialize analysis results
  const types: TypeInfo[] = [];
  const usages: TypeUsage[] = [];
  const issues: TypeIssue[] = [];
  const typeHierarchy: { [typeName: string]: string[] } = {};
  
  // Track variables for type coverage calculation
  let totalVariables = 0;
  let typedVariables = 0;
  
  // Process each TypeScript/JavaScript file
  for (const file of fileData) {
    // Skip non-TS/JS files
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(file.extension || '')) {
      continue;
    }
    
    try {
      // Parse the file
      const ast = await parseFileFromPath(file.path);
      
      // Extract type definitions
      const typeDefinitions = extractTypeDefinitions(ast);
      
      // Process each type definition
      for (const typeDef of typeDefinitions) {
        const typeInfo = extractTypeInfo(typeDef, file.path);
        if (typeInfo) {
          types.push(typeInfo);
          
          // Build type hierarchy
          if (typeInfo.extends && typeInfo.extends.length > 0) {
            typeHierarchy[typeInfo.name] = typeInfo.extends;
          }
        }
      }
      
      // Find type usages
      const fileUsages = findTypeUsages(ast, file.path, types);
      usages.push(...fileUsages);
      
      // Analyze variables for type coverage
      const { total, typed } = analyzeTypeCoverage(ast);
      totalVariables += total;
      typedVariables += typed;
      
      // Find type issues
      const fileIssues = findTypeIssues(ast, file.path);
      issues.push(...fileIssues);
      
    } catch (error: any) {
      console.error(`Error analyzing types in ${file.path}:`, error);
      // Add an issue for files that couldn't be parsed
      issues.push({
        id: `parse-error-${file.path}`,
        kind: 'complex',
        severity: 'error',
        message: `Failed to parse file for type analysis: ${error.message}`,
        filePath: file.path,
        suggestion: 'Check for syntax errors or TypeScript configuration issues.'
      });
    }
  }
  
  // Calculate statistics
  const stats = {
    totalTypes: types.length,
    interfaces: types.filter(t => t.kind === 'interface').length,
    typeAliases: types.filter(t => t.kind === 'type').length,
    enums: types.filter(t => t.kind === 'enum').length,
    classes: types.filter(t => t.kind === 'class').length,
    coverage: totalVariables > 0 ? (typedVariables / totalVariables) * 100 : 0,
    anyUsage: issues.filter(i => i.kind === 'any').length,
    issueCount: issues.length
  };
  
  return {
    types,
    usages,
    issues,
    stats,
    typeHierarchy
  };
}

/**
 * Extract detailed information from a type definition
 */
function extractTypeInfo(node: parser.TSESTree.Node, filePath: string): TypeInfo | null {
  let typeInfo: TypeInfo | null = null;
  
  if (node.type === AST_NODE_TYPES.TSInterfaceDeclaration && node.id) {
    // Process interface declaration
    const properties = extractInterfaceProperties(node);
    const extendsTypes = extractExtendedInterfaces(node);
    
    typeInfo = {
      id: `interface-${node.id.name}-${path.basename(filePath)}`,
      name: node.id.name,
      kind: 'interface',
      filePath,
      properties,
      extends: extendsTypes,
      exported: isNodeExported(node),
      loc: node.loc
    };
  } else if (node.type === AST_NODE_TYPES.TSTypeAliasDeclaration && node.id) {
    // Process type alias
    typeInfo = {
      id: `type-${node.id.name}-${path.basename(filePath)}`,
      name: node.id.name,
      kind: 'type',
      filePath,
      exported: isNodeExported(node),
      loc: node.loc
    };
    
    // Extract properties if it's an object type
    if (node.typeAnnotation.type === AST_NODE_TYPES.TSTypeLiteral) {
      typeInfo.properties = extractTypeLiteralProperties(node.typeAnnotation);
    }
  } else if (node.type === AST_NODE_TYPES.TSEnumDeclaration && node.id) {
    // Process enum
    typeInfo = {
      id: `enum-${node.id.name}-${path.basename(filePath)}`,
      name: node.id.name,
      kind: 'enum',
      filePath,
      exported: isNodeExported(node),
      loc: node.loc
    };
  } else if (node.type === AST_NODE_TYPES.ClassDeclaration && node.id) {
    // Process class (which can have implements)
    const implementsTypes = node.implements?.map(impl => 
      impl.expression.type === AST_NODE_TYPES.Identifier ? impl.expression.name : 'unknown'
    ) || [];
    
    const extendsType = node.superClass?.type === AST_NODE_TYPES.Identifier 
      ? [node.superClass.name] 
      : [];
    
    typeInfo = {
      id: `class-${node.id.name}-${path.basename(filePath)}`,
      name: node.id.name,
      kind: 'class',
      filePath,
      extends: extendsType,
      implements: implementsTypes,
      exported: isNodeExported(node),
      loc: node.loc
    };
  }
  
  return typeInfo;
}

/**
 * Extract properties from an interface declaration
 */
function extractInterfaceProperties(node: parser.TSESTree.TSInterfaceDeclaration): TypeProperty[] {
  const properties: TypeProperty[] = [];
  
  for (const member of node.body.body) {
    if (member.type === AST_NODE_TYPES.TSPropertySignature && 
        member.key.type === AST_NODE_TYPES.Identifier) {
      
      let typeString = 'any';
      if (member.typeAnnotation) {
        typeString = getTypeAnnotationString(member.typeAnnotation.typeAnnotation);
      }
      
      properties.push({
        name: member.key.name,
        type: typeString,
        optional: !!member.optional,
        readonly: !!member.readonly
      });
    }
  }
  
  return properties;
}

/**
 * Extract properties from a type literal
 */
function extractTypeLiteralProperties(node: parser.TSESTree.TSTypeLiteral): TypeProperty[] {
  const properties: TypeProperty[] = [];
  
  for (const member of node.members) {
    if (member.type === AST_NODE_TYPES.TSPropertySignature && 
        member.key.type === AST_NODE_TYPES.Identifier) {
      
      let typeString = 'any';
      if (member.typeAnnotation) {
        typeString = getTypeAnnotationString(member.typeAnnotation.typeAnnotation);
      }
      
      properties.push({
        name: member.key.name,
        type: typeString,
        optional: !!member.optional,
        readonly: !!member.readonly
      });
    }
  }
  
  return properties;
}

/**
 * Extract extended interfaces from an interface declaration
 */
function extractExtendedInterfaces(node: parser.TSESTree.TSInterfaceDeclaration): string[] {
  const extendedInterfaces: string[] = [];
  
  if (node.extends) {
    for (const ext of node.extends) {
      if (ext.expression.type === AST_NODE_TYPES.Identifier) {
        extendedInterfaces.push(ext.expression.name);
      }
    }
  }
  
  return extendedInterfaces;
}

/**
 * Find usages of defined types in the AST
 */
function findTypeUsages(
  ast: parser.TSESTree.Program, 
  filePath: string, 
  definedTypes: TypeInfo[]
): TypeUsage[] {
  const usages: { [typeId: string]: TypeUsage } = {};
  
  // Initialize usage tracking for all types
  for (const type of definedTypes) {
    usages[type.id] = {
      typeId: type.id,
      filePath,
      count: 0,
      locations: []
    };
  }
  
  // Traverse AST to find type references
  parser.simpleTraverse(ast, {
    enter(node) {
      // Check type annotations on variables, parameters, etc.
      if (node.type === AST_NODE_TYPES.TSTypeReference && 
          node.typeName.type === AST_NODE_TYPES.Identifier) {
        
        const typeName = node.typeName.name;
        const matchingTypes = definedTypes.filter(t => t.name === typeName);
        
        for (const type of matchingTypes) {
          if (!usages[type.id]) continue;
          
          usages[type.id].count++;
          if (node.loc) {
            usages[type.id].locations.push({
              line: node.loc.start.line,
              column: node.loc.start.column
            });
          }
        }
      }
    }
  });
  
  // Convert to array and filter out unused types
  return Object.values(usages).filter(usage => usage.count > 0);
}

/**
 * Analyze type coverage (percentage of variables/parameters with type annotations)
 */
function analyzeTypeCoverage(ast: parser.TSESTree.Program): { total: number; typed: number } {
  let totalVariables = 0;
  let typedVariables = 0;
  
  parser.simpleTraverse(ast, {
    enter(node) {
      // Check variable declarations
      if (node.type === AST_NODE_TYPES.VariableDeclarator) {
        totalVariables++;
        if (node.id.typeAnnotation) {
          typedVariables++;
        }
      }
      
      // Check function parameters
      if ((node.type === AST_NODE_TYPES.FunctionDeclaration || 
           node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
           node.type === AST_NODE_TYPES.FunctionExpression) && 
          node.params) {
        
        for (const param of node.params) {
          totalVariables++;
          
          if (param.type === AST_NODE_TYPES.Identifier && param.typeAnnotation) {
            typedVariables++;
          } else if (param.type === AST_NODE_TYPES.ObjectPattern || 
                     param.type === AST_NODE_TYPES.ArrayPattern) {
            // For destructured parameters, we count them as typed if the overall pattern has a type
            if (param.typeAnnotation) {
              typedVariables++;
            }
          }
        }
      }
    }
  });
  
  return { total: totalVariables, typed: typedVariables };
}

/**
 * Find potential type issues in the AST
 */
function findTypeIssues(ast: parser.TSESTree.Program, filePath: string): TypeIssue[] {
  const issues: TypeIssue[] = [];
  
  parser.simpleTraverse(ast, {
    enter(node) {
      // Check for 'any' type usage
      if (node.type === AST_NODE_TYPES.TSAnyKeyword && node.parent && node.parent.loc) {
        issues.push({
          id: `any-${filePath}-${node.parent.loc.start.line}-${node.parent.loc.start.column}`,
          kind: 'any',
          severity: 'warning',
          message: 'Usage of `any` type detected',
          filePath,
          loc: node.parent.loc,
          suggestion: 'Consider using a more specific type or `unknown` if the type is truly not known'
        });
      }
      
      // Check for complex union types (with more than 3 members)
      if (node.type === AST_NODE_TYPES.TSUnionType && node.types.length > 3 && node.loc) {
        issues.push({
          id: `complex-union-${filePath}-${node.loc.start.line}-${node.loc.start.column}`,
          kind: 'complex',
          severity: 'info',
          message: `Complex union type with ${node.types.length} members`,
          filePath,
          loc: node.loc,
          suggestion: 'Consider creating a named type alias for this union to improve readability'
        });
      }
      
      // Check for type assertions that might be unsafe
      if (node.type === AST_NODE_TYPES.TSTypeAssertion && node.loc) {
        issues.push({
          id: `type-assertion-${filePath}-${node.loc.start.line}-${node.loc.start.column}`,
          kind: 'inconsistent',
          severity: 'info',
          message: 'Type assertion used',
          filePath,
          loc: node.loc,
          suggestion: 'Consider using type guards or runtime checks instead of type assertions when possible'
        });
      }
    }
  });
  
  return issues;
}

/**
 * Check if a node is exported
 */
function isNodeExported(node: parser.TSESTree.Node): boolean {
  if (!node.parent) return false;
  
  if (node.parent.type === AST_NODE_TYPES.ExportNamedDeclaration || 
      node.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
    return true;
  }
  
  // Check for 'export' modifier in TypeScript nodes
  if ('modifiers' in node && Array.isArray(node.modifiers)) {
    return node.modifiers.some(
      (modifier: any) => modifier.type === AST_NODE_TYPES.TSExportKeyword
    );
  }
  
  return false;
}

/**
 * Convert a type annotation to a string representation
 */
function getTypeAnnotationString(typeAnnotation: parser.TSESTree.TypeNode): string {
  switch (typeAnnotation.type) {
    case AST_NODE_TYPES.TSStringKeyword:
      return 'string';
    case AST_NODE_TYPES.TSNumberKeyword:
      return 'number';
    case AST_NODE_TYPES.TSBooleanKeyword:
      return 'boolean';
    case AST_NODE_TYPES.TSObjectKeyword:
      return 'object';
    case AST_NODE_TYPES.TSAnyKeyword:
      return 'any';
    case AST_NODE_TYPES.TSUnknownKeyword:
      return 'unknown';
    case AST_NODE_TYPES.TSNullKeyword:
      return 'null';
    case AST_NODE_TYPES.TSUndefinedKeyword:
      return 'undefined';
    case AST_NODE_TYPES.TSVoidKeyword:
      return 'void';
    case AST_NODE_TYPES.TSNeverKeyword:
      return 'never';
    case AST_NODE_TYPES.TSArrayType:
      return `${getTypeAnnotationString(typeAnnotation.elementType)}[]`;
    case AST_NODE_TYPES.TSUnionType:
      return typeAnnotation.types.map(getTypeAnnotationString).join(' | ');
    case AST_NODE_TYPES.TSIntersectionType:
      return typeAnnotation.types.map(getTypeAnnotationString).join(' & ');
    case AST_NODE_TYPES.TSTypeReference:
      if (typeAnnotation.typeName.type === AST_NODE_TYPES.Identifier) {
        return typeAnnotation.typeName.name;
      }
      return 'complex-type';
    case AST_NODE_TYPES.TSTypeLiteral:
      return 'object-literal';
    case AST_NODE_TYPES.TSFunctionType:
      return 'function';
    default:
      return 'complex-type';
  }
}
