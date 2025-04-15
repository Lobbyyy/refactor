
import React, { useCallback, useRef, useState } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeProps,
  Handle,
  Position,
  Panel,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Define Node Types
interface ComponentNodeData {
  label: string;
  filePath: string;
  type: 'component' | 'page' | 'layout' | 'utils' | 'hook';
  props?: string[];
  imports?: number;
  exports?: number;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Define custom node type
type CustomNode = Node<ComponentNodeData>;

// Custom Node Component
const ComponentNode = ({ 
  data, 
  selected, 
  isConnectable 
}: NodeProps) => {
  // Type assertion to ensure TypeScript knows data has the right shape
  const nodeData = data as ComponentNodeData;

  return (
    <div 
      className={cn(
        "px-4 py-2 shadow-md rounded-md border-2",
        nodeData.type === 'component' && "border-graph-component",
        nodeData.type === 'page' && "border-graph-route",
        nodeData.type === 'hook' && "border-graph-type",
        nodeData.type === 'utils' && "border-graph-dependency",
        "flex flex-col min-w-[150px]"
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="font-bold text-sm">{nodeData.label}</div>
        <Badge variant="outline" className="text-xs capitalize">
          {nodeData.type}
        </Badge>
      </div>
      {nodeData.props && nodeData.props.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 border-t border-border pt-1">
          {nodeData.props.map(prop => (
            <div key={prop} className="overflow-hidden text-ellipsis">{prop}</div>
          ))}
        </div>
      )}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        className="w-3 h-3"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        className="w-3 h-3"
      />
    </div>
  );
};

interface ComponentVisualizerProps {
  projectData?: {
    components: CustomNode[];
    relationships: Edge[];
  };
}

// Define node types properly for ReactFlow
const nodeTypes: NodeTypes = {
  component: ComponentNode,
};

const ComponentVisualizer: React.FC<ComponentVisualizerProps> = ({ projectData }) => {
  const flowRef = useRef<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for initial display
  const initialNodes: CustomNode[] = projectData?.components || [
    {
      id: '1',
      type: 'component',
      position: { x: 250, y: 5 },
      data: { 
        label: 'Header', 
        filePath: '/components/Header.tsx',
        type: 'component',
        props: ['title: string', 'transparent?: boolean']
      },
    },
    {
      id: '2',
      type: 'component',
      position: { x: 100, y: 150 },
      data: { 
        label: 'Navbar', 
        filePath: '/components/Navbar.tsx', 
        type: 'component',
        props: ['links: NavLink[]']
      },
    },
    {
      id: '3',
      type: 'component',
      position: { x: 400, y: 150 },
      data: { 
        label: 'Logo', 
        filePath: '/components/Logo.tsx',
        type: 'component',
        props: ['size: "sm" | "md" | "lg"']
      },
    },
    {
      id: '4',
      type: 'component',
      position: { x: 250, y: 300 },
      data: { 
        label: 'HomePage', 
        filePath: '/pages/index.tsx',
        type: 'page',
      },
    },
    {
      id: '5',
      type: 'component',
      position: { x: 500, y: 300 },
      data: { 
        label: 'useAuth', 
        filePath: '/hooks/useAuth.ts',
        type: 'hook',
        props: ['returns: { user, login, logout }']
      },
    },
  ];

  const initialEdges: Edge[] = projectData?.relationships || [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e1-3', source: '1', target: '3' },
    { id: 'e4-1', source: '4', target: '1' },
    { id: 'e4-5', source: '4', target: '5', animated: true },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSearch = useCallback(() => {
    if (!searchTerm) return;

    const matchingNode = nodes.find((node) => {
      const nodeData = node.data as ComponentNodeData;
      return nodeData.label.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (matchingNode && flowRef.current) {
      // @ts-expect-error - Type mismatch with React Flow's instance type
      const instance = flowRef.current;
      // Center view on the found node
      instance.setCenter(matchingNode.position.x, matchingNode.position.y, { zoom: 1.5, duration: 800 });
      
      // Highlight the node (you'd need to implement this part)
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === matchingNode.id) {
            node.style = { ...node.style, boxShadow: '0 0 8px 2px rgba(var(--graph-selected), 0.8)' };
          } else {
            // Reset other nodes
            const { boxShadow, ...restStyle } = node.style || {};
            node.style = restStyle;
          }
          return node;
        })
      );
    }
  }, [searchTerm, nodes, setNodes]);

  return (
    <div className="h-full">
      <ReactFlow
        ref={flowRef}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        minZoom={0.1}
        className="bg-background"
      >
        <Panel position="top-left" className="bg-card border border-border rounded-md shadow-sm p-2 m-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search components..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </Panel>
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const nodeData = node.data as ComponentNodeData;
            if (nodeData.type === 'component') return 'var(--graph-component)';
            if (nodeData.type === 'page') return 'var(--graph-route)';
            if (nodeData.type === 'hook') return 'var(--graph-type)';
            return 'var(--graph-dependency)';
          }}
        />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default ComponentVisualizer;
