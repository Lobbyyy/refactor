import * as parser from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { readFileContent } from './fileSystem';

// TypeScript parsing options
const PARSER_OPTIONS = {
  jsx: true,
  loc: true,
  range: true,
  tokens: true,
  comment: true,
  errorOnUnknownASTType: false,
};

/**
 * Parse TypeScript/JavaScript file and return AST
 */
export function parseFile(code: string, filePath?: string): parser.TSESTree.Program {
  try {
    return parser.parse(code, {
      ...PARSER_OPTIONS,
      filePath,
    });
  } catch (error) {
    console.error(`Error parsing file ${filePath || 'unknown'}:`, error);
    throw error;
  }
}

/**
 * Parse a file from disk and return AST
 */
export async function parseFileFromPath(filePath: string): Promise<parser.TSESTree.Program> {
  try {
    const code = await readFileContent(filePath);
    return parseFile(code, filePath);
  } catch (error) {
    console.error(`Error parsing file from path ${filePath}:`, error);
    throw error;
  }
}

/**
 * Extract all import declarations from AST
 */
export function extractImports(ast: parser.TSESTree.Program): parser.TSESTree.ImportDeclaration[] {
  const imports: parser.TSESTree.ImportDeclaration[] = [];
  
  // Traverse the AST to find import declarations
  parser.simpleTraverse(ast, {
    enter(node) {
      if (node.type === AST_NODE_TYPES.ImportDeclaration) {
        imports.push(node);
      }
    },
  });
  
  return imports;
}

/**
 * Extract all export declarations from AST
 */
export function extractExports(ast: parser.TSESTree.Program): Array<
  | parser.TSESTree.ExportNamedDeclaration
  | parser.TSESTree.ExportDefaultDeclaration
  | parser.TSESTree.ExportAllDeclaration
> {
  const exports: Array<
    | parser.TSESTree.ExportNamedDeclaration
    | parser.TSESTree.ExportDefaultDeclaration
    | parser.TSESTree.ExportAllDeclaration
  > = [];
  
  // Traverse the AST to find export declarations
  parser.simpleTraverse(ast, {
    enter(node) {
      if (
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportDefaultDeclaration ||
        node.type === AST_NODE_TYPES.ExportAllDeclaration
      ) {
        exports.push(node);
      }
    },
  });
  
  return exports;
}

/**
 * Extract all React component definitions from AST
 */
export function extractReactComponents(ast: parser.TSESTree.Program): parser.TSESTree.Node[] {
  const components: parser.TSESTree.Node[] = [];
  
  // Traverse the AST to find potential React components
  parser.simpleTraverse(ast, {
    enter(node) {
      // Function components (function declarations)
      if (
        node.type === AST_NODE_TYPES.FunctionDeclaration &&
        node.id?.name && 
        /^[A-Z]/.test(node.id.name)
      ) {
        components.push(node);
      }
      
      // Function components (variable declarations with arrow functions or function expressions)
      if (
        node.type === AST_NODE_TYPES.VariableDeclarator &&
        node.id.type === AST_NODE_TYPES.Identifier &&
        /^[A-Z]/.test(node.id.name) &&
        (node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
         node.init?.type === AST_NODE_TYPES.FunctionExpression)
      ) {
        components.push(node);
      }
      
      // Class components
      if (
        node.type === AST_NODE_TYPES.ClassDeclaration &&
        node.id?.name &&
        /^[A-Z]/.test(node.id.name) &&
        node.superClass
      ) {
        components.push(node);
      }
    },
  });
  
  return components;
}

/**
 * Extract all TypeScript interfaces and types from AST
 */
export function extractTypeDefinitions(ast: parser.TSESTree.Program): parser.TSESTree.Node[] {
  const types: parser.TSESTree.Node[] = [];
  
  // Traverse the AST to find type definitions
  parser.simpleTraverse(ast, {
    enter(node) {
      if (
        node.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
        node.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
        node.type === AST_NODE_TYPES.TSEnumDeclaration
      ) {
        types.push(node);
      }
    },
  });
  
  return types;
}

/**
 * Extract component props from a component definition
 */
export function extractComponentProps(component: parser.TSESTree.Node): string[] {
  const props: string[] = [];
  
  if (component.type === AST_NODE_TYPES.FunctionDeclaration) {
    // Function component props (first parameter)
    const firstParam = component.params[0];
    if (firstParam?.type === AST_NODE_TYPES.ObjectPattern) {
      firstParam.properties.forEach(prop => {
        if (prop.type === AST_NODE_TYPES.Property && prop.key.type === AST_NODE_TYPES.Identifier) {
          props.push(prop.key.name);
        }
      });
    }
  } else if (component.type === AST_NODE_TYPES.VariableDeclarator) {
    // Arrow function or function expression component
    const init = component.init;
    if (
      (init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
       init?.type === AST_NODE_TYPES.FunctionExpression) &&
      init.params[0]?.type === AST_NODE_TYPES.ObjectPattern
    ) {
      init.params[0].properties.forEach(prop => {
        if (prop.type === AST_NODE_TYPES.Property && prop.key.type === AST_NODE_TYPES.Identifier) {
          props.push(prop.key.name);
        }
      });
    }
  }
  
  return props;
}
