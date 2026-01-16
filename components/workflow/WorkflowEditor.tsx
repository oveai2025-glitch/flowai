/**
 * FlowAtGenAi - Workflow Editor
 * 
 * Main canvas component for building workflows.
 * Uses ReactFlow for the node-based editor.
 * 
 * @module components/workflow/WorkflowEditor
 */

'use client';

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  BackgroundVariant,
  ConnectionMode,
  SelectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '../../stores/workflow-store';
import WorkflowNode, { nodeTypes } from './WorkflowNode';
import NodePalette from './NodePalette';
import WorkflowToolbar from './WorkflowToolbar';
import NodeConfigPanel from './NodeConfigPanel';
import { cn } from '../../lib/utils';

// ============================================
// Custom Edge Styles
// ============================================

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
  style: {
    stroke: '#6B7280',
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#6B7280',
    width: 15,
    height: 15,
  },
};

// ============================================
// Workflow Canvas
// ============================================

const WorkflowCanvas: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project, fitView, setViewport } = useReactFlow();
  
  // Store state
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const selectedNodes = useWorkflowStore((s) => s.selectedNodes);
  const isExecuting = useWorkflowStore((s) => s.isExecuting);
  const nodeStates = useWorkflowStore((s) => s.nodeStates);
  const isPanelOpen = useWorkflowStore((s) => s.isPanelOpen);
  
  // Store actions
  const addNode = useWorkflowStore((s) => s.addNode);
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const deleteNodes = useWorkflowStore((s) => s.deleteNodes);
  const addEdge = useWorkflowStore((s) => s.addEdge);
  const deleteEdge = useWorkflowStore((s) => s.deleteEdge);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const selectNodes = useWorkflowStore((s) => s.selectNodes);
  const clearSelection = useWorkflowStore((s) => s.clearSelection);
  const openPanel = useWorkflowStore((s) => s.openPanel);
  const closePanel = useWorkflowStore((s) => s.closePanel);
  const setViewportStore = useWorkflowStore((s) => s.setViewport);
  const pushHistory = useWorkflowStore((s) => s.pushHistory);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const copy = useWorkflowStore((s) => s.copy);
  const paste = useWorkflowStore((s) => s.paste);
  const cut = useWorkflowStore((s) => s.cut);

  // Convert store nodes/edges to ReactFlow format
  const flowNodes: Node[] = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: 'workflowNode',
      position: node.position,
      data: {
        ...node.data,
        type: node.type,
        name: node.name,
        disabled: node.disabled,
        notes: node.notes,
      },
      selected: selectedNodes.includes(node.id),
      dragging: false,
    }));
  }, [nodes, selectedNodes]);

  const flowEdges: Edge[] = useMemo(() => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      type: 'smoothstep',
      animated: isExecuting && nodeStates[edge.source]?.status === 'success',
      style: {
        stroke: edge.type === 'success' ? '#10B981' : 
               edge.type === 'error' ? '#EF4444' : '#6B7280',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.type === 'success' ? '#10B981' : 
               edge.type === 'error' ? '#EF4444' : '#6B7280',
      },
    }));
  }, [edges, isExecuting, nodeStates]);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: any[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNode(change.id, { position: change.position });
        }
        if (change.type === 'select') {
          if (change.selected) {
            selectNode(change.id, false);
          }
        }
        if (change.type === 'remove') {
          deleteNode(change.id);
        }
      });
    },
    [updateNode, selectNode, deleteNode]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: any[]) => {
      changes.forEach((change) => {
        if (change.type === 'remove') {
          deleteEdge(change.id);
        }
      });
    },
    [deleteEdge]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdge({
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
        });
      }
    },
    [addEdge]
  );

  // Handle node selection
  const onSelectionChange = useCallback(
    ({ nodes: selectedFlowNodes }: { nodes: Node[] }) => {
      const ids = selectedFlowNodes.map((n) => n.id);
      selectNodes(ids);
    },
    [selectNodes]
  );

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle node double click (open config panel)
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      openPanel(node.id);
    },
    [openPanel]
  );

  // Handle pane click (clear selection)
  const onPaneClick = useCallback(() => {
    clearSelection();
    closePanel();
  }, [clearSelection, closePanel]);

  // Handle drop (from node palette)
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      try {
        const { type, name } = JSON.parse(data);
        
        // Get drop position
        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return;

        const position = project({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });

        // Add new node
        const nodeId = addNode({
          type,
          name,
          position,
          data: {},
        });

        // Select the new node
        selectNode(nodeId);
      } catch (error) {
        console.error('Failed to parse dropped data:', error);
      }
    },
    [project, addNode, selectNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Delete selected nodes
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodes.length > 0) {
          event.preventDefault();
          deleteNodes(selectedNodes);
        }
      }

      // Undo
      if (modKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      // Redo
      if (modKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      }

      // Copy
      if (modKey && event.key === 'c') {
        event.preventDefault();
        copy();
      }

      // Paste
      if (modKey && event.key === 'v') {
        event.preventDefault();
        paste();
      }

      // Cut
      if (modKey && event.key === 'x') {
        event.preventDefault();
        cut();
      }

      // Select all
      if (modKey && event.key === 'a') {
        event.preventDefault();
        selectNodes(nodes.map((n) => n.id));
      }

      // Escape - close panel
      if (event.key === 'Escape') {
        closePanel();
        clearSelection();
      }

      // Fit view
      if (modKey && event.key === '0') {
        event.preventDefault();
        fitView({ padding: 0.2 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodes,
    nodes,
    deleteNodes,
    undo,
    redo,
    copy,
    paste,
    cut,
    selectNodes,
    closePanel,
    clearSelection,
    fitView,
  ]);

  // Handle viewport changes
  const onMoveEnd = useCallback(
    (_event: any, viewport: { x: number; y: number; zoom: number }) => {
      setViewportStore(viewport);
    },
    [setViewportStore]
  );

  return (
    <div className="flex h-full">
      {/* Node Palette */}
      <NodePalette />

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onMoveEnd={onMoveEnd}
          onSelectionChange={onSelectionChange}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
          selectionMode={SelectionMode.Partial}
          panOnScroll
          selectionOnDrag
          panOnDrag={[1, 2]}
          selectNodesOnDrag={false}
          zoomOnDoubleClick={false}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={4}
          snapToGrid
          snapGrid={[15, 15]}
          className="bg-gray-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#374151"
          />
          <Controls
            className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700"
            showZoom
            showFitView
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(node) => {
              const state = nodeStates[node.id];
              if (state?.status === 'running') return '#3B82F6';
              if (state?.status === 'success') return '#10B981';
              if (state?.status === 'error') return '#EF4444';
              return '#6B7280';
            }}
            maskColor="rgba(0, 0, 0, 0.8)"
            className="!bg-gray-900 !border-gray-700 !rounded-lg"
          />

          {/* Toolbar */}
          <Panel position="top-center" className="!m-0">
            <WorkflowToolbar />
          </Panel>
        </ReactFlow>
      </div>

      {/* Config Panel */}
      {isPanelOpen && <NodeConfigPanel />}
    </div>
  );
};

// ============================================
// Main Editor Component
// ============================================

const WorkflowEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div className="h-screen w-full bg-gray-950">
        <WorkflowCanvas />
      </div>
    </ReactFlowProvider>
  );
};

export default WorkflowEditor;
