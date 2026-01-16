/**
 * FlowAtGenAi - Workflow Store
 * 
 * Zustand store for managing workflow state in the visual editor.
 * Handles nodes, edges, selection, history (undo/redo), and execution state.
 * 
 * @module stores/workflow-store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  Workflow, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowSettings,
} from '../types/workflow';

// ============================================
// Types
// ============================================

export interface HistoryEntry {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  timestamp: number;
}

export interface NodeExecutionState {
  status: 'idle' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: number;
  endTime?: number;
  output?: unknown;
  error?: string;
}

export interface WorkflowState {
  workflow: Workflow | null;
  isDirty: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodes: string[];
  selectedEdges: string[];
  viewport: { x: number; y: number; zoom: number };
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;
  isExecuting: boolean;
  executionId: string | null;
  nodeStates: Record<string, NodeExecutionState>;
  isPanelOpen: boolean;
  selectedNodeId: string | null;
  isNodePaletteOpen: boolean;
  searchQuery: string;
  clipboard: { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null;
}

// ============================================
// Helper Functions
// ============================================

const generateId = () => Math.random().toString(36).substring(2, 15);

const defaultWorkflowSettings: WorkflowSettings = {
  errorHandling: 'stop',
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMinutes: 30,
  timezone: 'UTC',
  notifyOnError: true,
  notifyOnSuccess: false,
  saveExecutionData: true,
  executionDataRetentionDays: 30,
};

const createNewWorkflow = (): Workflow => ({
  id: generateId(),
  name: 'Untitled Workflow',
  nodes: [],
  edges: [],
  settings: defaultWorkflowSettings,
  isActive: false,
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: '',
  organizationId: '',
});

// ============================================
// Initial State
// ============================================

const initialState: WorkflowState = {
  workflow: null,
  isDirty: false,
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  isExecuting: false,
  executionId: null,
  nodeStates: {},
  isPanelOpen: false,
  selectedNodeId: null,
  isNodePaletteOpen: true,
  searchQuery: '',
  clipboard: null,
};

// ============================================
// Store
// ============================================

export const useWorkflowStore = create<WorkflowState & {
  // Workflow CRUD
  newWorkflow: () => void;
  loadWorkflow: (workflow: Workflow) => void;
  saveWorkflow: () => Workflow | null;
  setWorkflowName: (name: string) => void;
  setWorkflowSettings: (settings: Partial<WorkflowSettings>) => void;
  
  // Node operations
  addNode: (node: Omit<WorkflowNode, 'id'> & { id?: string }) => string;
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNode['data']>) => void;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNode: (id: string) => string | null;
  
  // Edge operations
  addEdge: (edge: Omit<WorkflowEdge, 'id'> & { id?: string }) => string;
  updateEdge: (id: string, updates: Partial<WorkflowEdge>) => void;
  deleteEdge: (id: string) => void;
  
  // Selection
  selectNode: (id: string, addToSelection?: boolean) => void;
  selectNodes: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Viewport
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  
  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Clipboard
  copy: () => void;
  paste: (position?: { x: number; y: number }) => void;
  cut: () => void;
  
  // Execution
  startExecution: (executionId: string) => void;
  stopExecution: () => void;
  setNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  clearExecutionState: () => void;
  
  // UI
  openPanel: (nodeId: string) => void;
  closePanel: () => void;
  toggleNodePalette: () => void;
  setSearchQuery: (query: string) => void;
  
  // Utilities
  getNode: (id: string) => WorkflowNode | undefined;
  getEdge: (id: string) => WorkflowEdge | undefined;
  getConnectedNodes: (nodeId: string) => { incoming: string[]; outgoing: string[] };
  validateWorkflow: () => { valid: boolean; errors: string[] };
}>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================
      // Workflow CRUD
      // ========================================

      newWorkflow: () => {
        const workflow = createNewWorkflow();
        set({
          workflow,
          nodes: [],
          edges: [],
          isDirty: false,
          history: [],
          historyIndex: -1,
          selectedNodes: [],
          selectedEdges: [],
          nodeStates: {},
        });
      },

      loadWorkflow: (workflow) => {
        set({
          workflow,
          nodes: workflow.nodes,
          edges: workflow.edges,
          isDirty: false,
          history: [],
          historyIndex: -1,
          selectedNodes: [],
          selectedEdges: [],
          nodeStates: {},
        });
      },

      saveWorkflow: () => {
        const { workflow, nodes, edges } = get();
        if (!workflow) return null;

        const savedWorkflow: Workflow = {
          ...workflow,
          nodes,
          edges,
          updatedAt: new Date().toISOString(),
          version: workflow.version + 1,
        };

        set({ workflow: savedWorkflow, isDirty: false });
        return savedWorkflow;
      },

      setWorkflowName: (name) => {
        const { workflow } = get();
        if (workflow) {
          set({ workflow: { ...workflow, name }, isDirty: true });
        }
      },

      setWorkflowSettings: (settings) => {
        const { workflow } = get();
        if (workflow) {
          set({
            workflow: {
              ...workflow,
              settings: { ...workflow.settings, ...settings },
            },
            isDirty: true,
          });
        }
      },

      // ========================================
      // Node Operations
      // ========================================

      addNode: (nodeData) => {
        const id = nodeData.id || generateId();
        const node: WorkflowNode = { ...nodeData, id } as WorkflowNode;

        set((state) => ({
          nodes: [...state.nodes, node],
          isDirty: true,
        }));

        get().pushHistory();
        return id;
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
          isDirty: true,
        }));
      },

      updateNodeData: (id, data) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
          isDirty: true,
        }));
      },

      deleteNode: (id) => {
        get().pushHistory();
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodes: state.selectedNodes.filter((n) => n !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          isPanelOpen: state.selectedNodeId === id ? false : state.isPanelOpen,
          isDirty: true,
        }));
      },

      deleteNodes: (ids) => {
        get().pushHistory();
        set((state) => ({
          nodes: state.nodes.filter((n) => !ids.includes(n.id)),
          edges: state.edges.filter(
            (e) => !ids.includes(e.source) && !ids.includes(e.target)
          ),
          selectedNodes: state.selectedNodes.filter((n) => !ids.includes(n)),
          selectedNodeId:
            state.selectedNodeId && ids.includes(state.selectedNodeId)
              ? null
              : state.selectedNodeId,
          isPanelOpen:
            state.selectedNodeId && ids.includes(state.selectedNodeId)
              ? false
              : state.isPanelOpen,
          isDirty: true,
        }));
      },

      duplicateNode: (id) => {
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return null;

        const newId = generateId();
        const newNode: WorkflowNode = {
          ...JSON.parse(JSON.stringify(node)),
          id: newId,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          name: `${node.name} (copy)`,
        };

        set((state) => ({
          nodes: [...state.nodes, newNode],
          isDirty: true,
        }));

        get().pushHistory();
        return newId;
      },

      // ========================================
      // Edge Operations
      // ========================================

      addEdge: (edgeData) => {
        const id = edgeData.id || generateId();

        // Check if edge already exists
        const exists = get().edges.some(
          (e) =>
            e.source === edgeData.source &&
            e.target === edgeData.target &&
            e.sourceHandle === edgeData.sourceHandle &&
            e.targetHandle === edgeData.targetHandle
        );

        if (exists) return '';

        const edge: WorkflowEdge = { ...edgeData, id } as WorkflowEdge;

        set((state) => ({
          edges: [...state.edges, edge],
          isDirty: true,
        }));

        get().pushHistory();
        return id;
      },

      updateEdge: (id, updates) => {
        set((state) => ({
          edges: state.edges.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
          isDirty: true,
        }));
      },

      deleteEdge: (id) => {
        get().pushHistory();
        set((state) => ({
          edges: state.edges.filter((e) => e.id !== id),
          selectedEdges: state.selectedEdges.filter((e) => e !== id),
          isDirty: true,
        }));
      },

      // ========================================
      // Selection
      // ========================================

      selectNode: (id, addToSelection = false) => {
        set((state) => {
          if (addToSelection) {
            return {
              selectedNodes: state.selectedNodes.includes(id)
                ? state.selectedNodes
                : [...state.selectedNodes, id],
            };
          }
          return {
            selectedNodes: [id],
            selectedEdges: [],
          };
        });
      },

      selectNodes: (ids) => {
        set({ selectedNodes: ids });
      },

      clearSelection: () => {
        set({ selectedNodes: [], selectedEdges: [] });
      },

      selectAll: () => {
        set((state) => ({
          selectedNodes: state.nodes.map((n) => n.id),
          selectedEdges: state.edges.map((e) => e.id),
        }));
      },

      // ========================================
      // Viewport
      // ========================================

      setViewport: (viewport) => {
        set({ viewport });
      },

      zoomIn: () => {
        set((state) => ({
          viewport: {
            ...state.viewport,
            zoom: Math.min(state.viewport.zoom * 1.2, 4),
          },
        }));
      },

      zoomOut: () => {
        set((state) => ({
          viewport: {
            ...state.viewport,
            zoom: Math.max(state.viewport.zoom / 1.2, 0.1),
          },
        }));
      },

      // ========================================
      // History (Undo/Redo)
      // ========================================

      pushHistory: () => {
        const { nodes, edges, history, historyIndex, maxHistorySize } = get();

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          timestamp: Date.now(),
        });

        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      undo: () => {
        const { history, historyIndex, nodes, edges } = get();

        if (historyIndex < 0) return;

        // Save current state if at the end
        if (historyIndex === history.length - 1) {
          const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
            timestamp: Date.now(),
          };
          set({ history: [...history, currentState] });
        }

        const prevState = history[historyIndex];
        if (prevState) {
          set({
            nodes: prevState.nodes,
            edges: prevState.edges,
            historyIndex: Math.max(0, historyIndex - 1),
            isDirty: true,
          });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();

        if (historyIndex >= history.length - 1) return;

        const nextState = history[historyIndex + 1];
        if (nextState) {
          set({
            nodes: nextState.nodes,
            edges: nextState.edges,
            historyIndex: historyIndex + 1,
            isDirty: true,
          });
        }
      },

      canUndo: () => get().historyIndex >= 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // ========================================
      // Clipboard
      // ========================================

      copy: () => {
        const { nodes, edges, selectedNodes } = get();

        if (selectedNodes.length === 0) return;

        const nodesToCopy = nodes.filter((n) => selectedNodes.includes(n.id));
        const edgesToCopy = edges.filter(
          (e) =>
            selectedNodes.includes(e.source) && selectedNodes.includes(e.target)
        );

        set({
          clipboard: {
            nodes: JSON.parse(JSON.stringify(nodesToCopy)),
            edges: JSON.parse(JSON.stringify(edgesToCopy)),
          },
        });
      },

      paste: (position) => {
        const { clipboard, viewport } = get();

        if (!clipboard || clipboard.nodes.length === 0) return;

        const idMap = new Map<string, string>();
        const newNodes: WorkflowNode[] = [];
        const newEdges: WorkflowEdge[] = [];

        const minX = Math.min(...clipboard.nodes.map((n) => n.position.x));
        const minY = Math.min(...clipboard.nodes.map((n) => n.position.y));
        const offsetX = (position?.x ?? viewport.x + 100) - minX;
        const offsetY = (position?.y ?? viewport.y + 100) - minY;

        for (const node of clipboard.nodes) {
          const newId = generateId();
          idMap.set(node.id, newId);
          newNodes.push({
            ...JSON.parse(JSON.stringify(node)),
            id: newId,
            position: {
              x: node.position.x + offsetX,
              y: node.position.y + offsetY,
            },
          });
        }

        for (const edge of clipboard.edges) {
          const newSource = idMap.get(edge.source);
          const newTarget = idMap.get(edge.target);
          if (newSource && newTarget) {
            newEdges.push({
              ...JSON.parse(JSON.stringify(edge)),
              id: generateId(),
              source: newSource,
              target: newTarget,
            });
          }
        }

        set((state) => ({
          nodes: [...state.nodes, ...newNodes],
          edges: [...state.edges, ...newEdges],
          selectedNodes: newNodes.map((n) => n.id),
          isDirty: true,
        }));

        get().pushHistory();
      },

      cut: () => {
        get().copy();
        get().deleteNodes(get().selectedNodes);
      },

      // ========================================
      // Execution
      // ========================================

      startExecution: (executionId) => {
        const nodeStates: Record<string, NodeExecutionState> = {};
        for (const node of get().nodes) {
          nodeStates[node.id] = { status: 'idle' };
        }

        set({
          isExecuting: true,
          executionId,
          nodeStates,
        });
      },

      stopExecution: () => {
        set({
          isExecuting: false,
          executionId: null,
        });
      },

      setNodeExecutionState: (nodeId, state) => {
        set((prev) => ({
          nodeStates: {
            ...prev.nodeStates,
            [nodeId]: state,
          },
        }));
      },

      clearExecutionState: () => {
        set({
          isExecuting: false,
          executionId: null,
          nodeStates: {},
        });
      },

      // ========================================
      // UI
      // ========================================

      openPanel: (nodeId) => {
        set({
          isPanelOpen: true,
          selectedNodeId: nodeId,
        });
      },

      closePanel: () => {
        set({
          isPanelOpen: false,
          selectedNodeId: null,
        });
      },

      toggleNodePalette: () => {
        set((state) => ({
          isNodePaletteOpen: !state.isNodePaletteOpen,
        }));
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      // ========================================
      // Utilities
      // ========================================

      getNode: (id) => get().nodes.find((n) => n.id === id),
      getEdge: (id) => get().edges.find((e) => e.id === id),

      getConnectedNodes: (nodeId) => {
        const { edges } = get();
        const incoming: string[] = [];
        const outgoing: string[] = [];

        for (const edge of edges) {
          if (edge.target === nodeId) incoming.push(edge.source);
          if (edge.source === nodeId) outgoing.push(edge.target);
        }

        return { incoming, outgoing };
      },

      validateWorkflow: () => {
        const { nodes, edges } = get();
        const errors: string[] = [];

        // Check for trigger node
        const triggerNodes = nodes.filter((n) => n.type.startsWith('trigger-'));
        if (triggerNodes.length === 0) {
          errors.push('Workflow must have at least one trigger node');
        }

        // Check for disconnected nodes
        for (const node of nodes) {
          if (node.type.startsWith('trigger-')) continue;

          const hasIncoming = edges.some((e) => e.target === node.id);
          if (!hasIncoming) {
            errors.push(`Node "${node.name}" is not connected to any input`);
          }
        }

        // Check for cycles
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (nodeId: string): boolean => {
          visited.add(nodeId);
          recursionStack.add(nodeId);

          const outgoingEdges = edges.filter((e) => e.source === nodeId);
          for (const edge of outgoingEdges) {
            if (!visited.has(edge.target)) {
              if (hasCycle(edge.target)) return true;
            } else if (recursionStack.has(edge.target)) {
              return true;
            }
          }

          recursionStack.delete(nodeId);
          return false;
        };

        for (const node of triggerNodes) {
          if (hasCycle(node.id)) {
            errors.push('Workflow contains a cycle which would cause infinite loops');
            break;
          }
        }

        return { valid: errors.length === 0, errors };
      },
    }),
    { name: 'FlowAtGenAi-Workflow' }
  )
);

export default useWorkflowStore;
