"use client";

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface FlowchartVisualizationProps {
  data: any;
  title: string;
  description: string;
}

const nodeTypes = {
  // Add custom node types here if needed
};

export default function FlowchartVisualization({ data, title, description }: FlowchartVisualizationProps) {
  // Generate nodes and edges from the AI data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    if (!data) return { nodes, edges };
    
    // If data is an array of objects, create a flowchart
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const nodeId = `node-${index}`;
        
        // Create node
        nodes.push({
          id: nodeId,
          type: 'default',
          position: { x: 100 + (index % 3) * 200, y: 50 + Math.floor(index / 3) * 100 },
          data: { 
            label: typeof item === 'string' ? item : item.title || item.name || item.concept || `Step ${index + 1}`
          },
          style: {
            background: '#fff',
            border: '1px solid #ddd',
            padding: '10px',
            borderRadius: '5px',
            width: 150,
            textAlign: 'center',
          },
        });
        
        // Create edge to next node
        if (index < data.length - 1) {
          edges.push({
            id: `edge-${index}`,
            source: nodeId,
            target: `node-${index + 1}`,
            animated: true,
            type: 'smoothstep',
          });
        }
      });
    } else if (data.nodes && data.edges) {
      // If data is already in graph format
      nodes.push(...data.nodes);
      edges.push(...data.edges);
    } else if (typeof data === 'object') {
      // Create nodes from object keys
      const keys = Object.keys(data);
      keys.forEach((key, index) => {
        const nodeId = `node-${index}`;
        nodes.push({
          id: nodeId,
          type: 'default',
          position: { x: 100 + (index % 3) * 200, y: 50 + Math.floor(index / 3) * 100 },
          data: { 
            label: `${key}: ${data[key]}`
          },
          style: {
            background: '#fff',
            border: '1px solid #ddd',
            padding: '10px',
            borderRadius: '5px',
            width: 150,
            textAlign: 'center',
          },
        });
        
        if (index < keys.length - 1) {
          edges.push({
            id: `edge-${index}`,
            source: nodeId,
            target: `node-${index + 1}`,
            animated: true,
            type: 'smoothstep',
          });
        }
      });
    }
    
    return { nodes, edges };
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="h-64 border rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No flowchart data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 border rounded-lg bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        nodeTypes={nodeTypes}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
        <Panel position="top-right">
          <div className="bg-white p-2 rounded shadow text-sm">
            <strong>{title}</strong>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}