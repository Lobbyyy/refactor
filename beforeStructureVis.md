
import React, { useState } from 'react';
import { Folder, FileCode, ChevronRight, ChevronDown, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface FileNode {
  name: string;
  path: string;
  type: 'file';
  size?: number;
  extension?: string;
  metadata?: {
    imports?: number;
    exports?: number;
    isPage?: boolean;
    isComponent?: boolean;
    isLayout?: boolean;
  };
}

interface DirectoryNode {
  name: string;
  path: string;
  type: 'directory';
  children: (FileNode | DirectoryNode)[];
  metadata?: {
    fileCount?: number;
    isPages?: boolean;
    isApp?: boolean;
    isComponents?: boolean;
  };
}

type FileTreeNode = FileNode | DirectoryNode;

interface TreeNodeProps {
  node: FileTreeNode;
  depth?: number;
  selectedPath?: string;
  onSelectNode: (node: FileTreeNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  depth = 0, 
  selectedPath,
  onSelectNode
}) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDirectory = node.type === 'directory';
  const isSelected = selectedPath === node.path;

  const handleToggle = () => {
    if (isDirectory) {
      setExpanded(!expanded);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(node);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
      return <FileCode className="h-4 w-4 text-graph-component" />;
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
      return <FileCode className="h-4 w-4 text-graph-type" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center py-1 px-2 rounded-md transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
          "cursor-pointer"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
        onDoubleClick={handleToggle}
      >
        {isDirectory && (
          <button 
            className="mr-1 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? 
              <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
          </button>
        )}

        {isDirectory ? (
          <Folder className={cn(
            "h-4 w-4 mr-2",
            node.name === 'pages' || (node.metadata?.isPages) ? "text-graph-route" :
            node.name === 'app' || (node.metadata?.isApp) ? "text-graph-route" :
            node.name === 'components' || (node.metadata?.isComponents) ? "text-graph-component" :
            "text-muted-foreground"
          )} />
        ) : (
          <span className="mr-2">{getFileIcon(node.name)}</span>
        )}

        <span className="text-sm truncate">{node.name}</span>

        {node.type === 'file' && node.metadata && (
          <div className="ml-auto flex gap-1">
            {node.metadata.isPage && (
              <Badge variant="outline" className="text-[10px] h-4 bg-graph-route/10 border-graph-route text-graph-route">
                Page
              </Badge>
            )}
            {node.metadata.isComponent && (
              <Badge variant="outline" className="text-[10px] h-4 bg-graph-component/10 border-graph-component text-graph-component">
                Component
              </Badge>
            )}
          </div>
        )}
      </div>

      {isDirectory && expanded && (
        <div className="ml-2">
          {(node as DirectoryNode).children.map((childNode) => (
            <TreeNode 
              key={childNode.path} 
              node={childNode} 
              depth={depth + 1} 
              selectedPath={selectedPath}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface StructureVisualizerProps {
  projectData?: {
    name: string;
    structure: DirectoryNode;
  };
}

const StructureVisualizer: React.FC<StructureVisualizerProps> = ({ projectData }) => {
  const [selectedNode, setSelectedNode] = useState<FileTreeNode | null>(null);

  const handleSelectNode = (node: FileTreeNode) => {
    setSelectedNode(node);
  };

  // Mock data for initial display
  const mockProjectData = {
    name: "Next.js Project",
    structure: {
      name: "project-root",
      path: "/project-root",
      type: "directory" as const,
      children: [
        {
          name: "pages",
          path: "/project-root/pages",
          type: "directory" as const,
          metadata: { isPages: true },
          children: [
            {
              name: "index.tsx",
              path: "/project-root/pages/index.tsx",
              type: "file" as const,
              metadata: { isPage: true }
            },
            {
              name: "about.tsx",
              path: "/project-root/pages/about.tsx",
              type: "file" as const,
              metadata: { isPage: true }
            },
            {
              name: "_app.tsx",
              path: "/project-root/pages/_app.tsx",
              type: "file" as const,
            },
            {
              name: "api",
              path: "/project-root/pages/api",
              type: "directory" as const,
              children: [
                {
                  name: "hello.ts",
                  path: "/project-root/pages/api/hello.ts",
                  type: "file" as const,
                }
              ]
            }
          ]
        },
        {
          name: "components",
          path: "/project-root/components",
          type: "directory" as const,
          metadata: { isComponents: true },
          children: [
            {
              name: "Header.tsx",
              path: "/project-root/components/Header.tsx",
              type: "file" as const,
              metadata: { isComponent: true }
            },
            {
              name: "Footer.tsx",
              path: "/project-root/components/Footer.tsx",
              type: "file" as const,
              metadata: { isComponent: true }
            }
          ]
        },
        {
          name: "styles",
          path: "/project-root/styles",
          type: "directory" as const,
          children: [
            {
              name: "globals.css",
              path: "/project-root/styles/globals.css",
              type: "file" as const
            }
          ]
        },
        {
          name: "public",
          path: "/project-root/public",
          type: "directory" as const,
          children: [
            {
              name: "favicon.ico",
              path: "/project-root/public/favicon.ico",
              type: "file" as const
            }
          ]
        },
        {
          name: "tsconfig.json",
          path: "/project-root/tsconfig.json",
          type: "file" as const
        },
        {
          name: "package.json",
          path: "/project-root/package.json",
          type: "file" as const
        }
      ]
    }
  };

  const data = projectData || mockProjectData;

  return (
    <div className="h-full p-4">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <Card className="h-full border-0 rounded-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                Project Structure
              </CardTitle>
              <CardDescription>
                Explore your Next.js project files
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-0 h-[calc(100%-5rem)]">
              <ScrollArea className="h-full px-4 pb-4 custom-scrollbar">
                <TreeNode 
                  node={data.structure} 
                  selectedPath={selectedNode?.path}
                  onSelectNode={handleSelectNode}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={70}>
          <Card className="h-full border-0 rounded-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between">
                <span>File Preview</span>
                {selectedNode && (
                  <Badge variant="outline" className="font-mono">
                    {selectedNode.path}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedNode?.type === 'file' 
                  ? 'View and analyze file content' 
                  : 'Select a file to view its content'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-5rem)] bg-code text-code-foreground rounded-md overflow-hidden font-mono text-sm">
              {selectedNode?.type === 'file' ? (
                <ScrollArea className="h-full pr-4 custom-scrollbar">
                  <pre className="p-4 whitespace-pre-wrap overflow-x-auto">
                    {/* This would display actual file content in a real app */}
                    {`// ${selectedNode.name}
// This is a placeholder for the file content

import React from 'react';
${selectedNode.metadata?.isComponent ? `
const ${selectedNode.name.split('.')[0]} = () => {
  return (
    <div>
      <h1>Component Content</h1>
      <p>This would show the actual component code.</p>
    </div>
  );
};

export default ${selectedNode.name.split('.')[0]};
` : selectedNode.metadata?.isPage ? `
export default function ${selectedNode.name.split('.')[0].charAt(0).toUpperCase() + selectedNode.name.split('.')[0].slice(1)}() {
  return (
    <div>
      <h1>Page Content</h1>
      <p>This would show the actual page code.</p>
    </div>
  );
}
` : 'console.log("File content would be displayed here");'}
`}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a file to view its content
                </div>
              )}
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default StructureVisualizer;
