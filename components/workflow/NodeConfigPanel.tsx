/**
 * FlowAtGenAi - Node Configuration Panel
 * 
 * Side panel for configuring node properties when a node is selected.
 * Dynamically renders form fields based on node type.
 * 
 * @module components/workflow/NodeConfigPanel
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Settings,
  Code,
  Play,
  Trash2,
  Copy,
  MoreHorizontal,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkflowStore } from '../../stores/workflow-store';
import { nodeDefinitionsByType } from '../../lib/nodes/definitions';
import type { PropertyDefinition, NodeType } from '../../types/workflow';

// ============================================
// Form Field Components
// ============================================

interface FieldProps {
  property: PropertyDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

const StringField: React.FC<FieldProps> = ({ property, value, onChange }) => {
  const isMultiline = property.typeOptions?.rows && property.typeOptions.rows > 1;
  
  if (isMultiline) {
    return (
      <textarea
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={property.placeholder}
        rows={property.typeOptions?.rows || 3}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
      />
    );
  }

  return (
    <input
      type={property.typeOptions?.password ? 'password' : 'text'}
      value={String(value || '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={property.placeholder}
      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
};

const NumberField: React.FC<FieldProps> = ({ property, value, onChange }) => {
  return (
    <input
      type="number"
      value={value !== undefined ? Number(value) : ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      placeholder={property.placeholder}
      min={property.typeOptions?.minValue}
      max={property.typeOptions?.maxValue}
      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
};

const BooleanField: React.FC<FieldProps> = ({ property, value, onChange }) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={cn(
          'w-10 h-6 rounded-full p-1 transition-colors',
          value ? 'bg-blue-600' : 'bg-gray-700'
        )}
        onClick={() => onChange(!value)}
      >
        <div
          className={cn(
            'w-4 h-4 bg-white rounded-full transition-transform',
            value && 'translate-x-4'
          )}
        />
      </div>
      <span className="text-sm text-gray-300">
        {value ? 'Enabled' : 'Disabled'}
      </span>
    </label>
  );
};

const SelectField: React.FC<FieldProps> = ({ property, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = property.options?.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>{selectedOption?.name || 'Select...'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {property.options?.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700',
                  option.value === value && 'bg-gray-700 text-blue-400'
                )}
              >
                <span className="flex-1">{option.name}</span>
                {option.value === value && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const JsonField: React.FC<FieldProps> = ({ property, value, onChange }) => {
  const [text, setText] = useState(
    typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)
  );
  const [error, setError] = useState<string | null>(null);

  const handleChange = (newText: string) => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      onChange(parsed);
      setError(null);
    } catch (e) {
      setError('Invalid JSON');
    }
  };

  return (
    <div className="space-y-1">
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={8}
        className={cn(
          'w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none',
          error ? 'border-red-500' : 'border-gray-700'
        )}
      />
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

// ============================================
// Property Renderer
// ============================================

interface PropertyFieldProps {
  property: PropertyDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  showConditions?: Record<string, unknown>;
}

const PropertyField: React.FC<PropertyFieldProps> = ({
  property,
  value,
  onChange,
  showConditions,
}) => {
  // Check display conditions
  if (property.displayOptions?.show) {
    for (const [key, values] of Object.entries(property.displayOptions.show)) {
      const currentValue = showConditions?.[key];
      if (!values.includes(currentValue)) {
        return null;
      }
    }
  }

  let FieldComponent: React.FC<FieldProps>;

  switch (property.type) {
    case 'string':
      FieldComponent = StringField;
      break;
    case 'number':
      FieldComponent = NumberField;
      break;
    case 'boolean':
      FieldComponent = BooleanField;
      break;
    case 'options':
      FieldComponent = SelectField;
      break;
    case 'json':
      FieldComponent = JsonField;
      break;
    default:
      FieldComponent = StringField;
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-gray-300">
        {property.displayName}
        {property.required && <span className="text-red-400">*</span>}
        {property.description && (
          <button
            type="button"
            className="text-gray-500 hover:text-gray-400"
            title={property.description}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </label>
      <FieldComponent property={property} value={value} onChange={onChange} />
    </div>
  );
};

// ============================================
// Panel Sections
// ============================================

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-800 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        {icon}
        <span className="flex-1 text-sm font-medium text-gray-300 text-left">
          {title}
        </span>
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================
// Main Panel
// ============================================

const NodeConfigPanel: React.FC = () => {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const getNode = useWorkflowStore((s) => s.getNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const closePanel = useWorkflowStore((s) => s.closePanel);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const duplicateNode = useWorkflowStore((s) => s.duplicateNode);
  const nodeStates = useWorkflowStore((s) => s.nodeStates);

  const node = selectedNodeId ? getNode(selectedNodeId) : null;
  const nodeDefinition = node ? nodeDefinitionsByType[node.type] : null;
  const executionState = selectedNodeId ? nodeStates[selectedNodeId] : null;

  if (!node || !nodeDefinition) {
    return (
      <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Select a node to configure</p>
        </div>
      </div>
    );
  }

  const handleDataChange = (key: string, value: unknown) => {
    updateNodeData(node.id, { [key]: value });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this node?')) {
      deleteNode(node.id);
      closePanel();
    }
  };

  const handleDuplicate = () => {
    duplicateNode(node.id);
  };

  // Get all current data values for conditional display
  const showConditions = node.data as Record<string, unknown>;

  return (
    <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${nodeDefinition.iconColor}20` }}
        >
          <Settings className="w-5 h-5" style={{ color: nodeDefinition.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={node.name}
            onChange={(e) => updateNode(node.id, { name: e.target.value })}
            className="w-full bg-transparent text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
          />
          <p className="text-xs text-gray-500">{nodeDefinition.name}</p>
        </div>
        <button
          onClick={closePanel}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Execution Status */}
      {executionState && executionState.status !== 'idle' && (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm',
            executionState.status === 'running' && 'bg-blue-900/30 text-blue-300',
            executionState.status === 'success' && 'bg-green-900/30 text-green-300',
            executionState.status === 'error' && 'bg-red-900/30 text-red-300'
          )}
        >
          {executionState.status === 'running' && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {executionState.status === 'success' && (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {executionState.status === 'error' && (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="capitalize">{executionState.status}</span>
          {executionState.endTime && executionState.startTime && (
            <span className="text-xs opacity-75">
              ({executionState.endTime - executionState.startTime}ms)
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Properties */}
        <Section title="Parameters" icon={<Settings className="w-4 h-4 text-gray-400" />}>
          {nodeDefinition.properties.length === 0 ? (
            <p className="text-sm text-gray-500">
              This node has no configurable parameters.
            </p>
          ) : (
            <div className="space-y-4">
              {nodeDefinition.properties.map((prop) => (
                <PropertyField
                  key={prop.name}
                  property={prop}
                  value={(node.data as Record<string, unknown>)?.[prop.name] ?? prop.default}
                  onChange={(value) => handleDataChange(prop.name, value)}
                  showConditions={showConditions}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Notes */}
        <Section title="Notes" defaultOpen={!!node.notes}>
          <textarea
            value={node.notes || ''}
            onChange={(e) => updateNode(node.id, { notes: e.target.value })}
            placeholder="Add notes about this node..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </Section>

        {/* Settings */}
        <Section title="Settings" defaultOpen={false}>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Disabled</span>
            <div
              className={cn(
                'w-10 h-6 rounded-full p-1 transition-colors cursor-pointer',
                node.disabled ? 'bg-gray-600' : 'bg-gray-700'
              )}
              onClick={() => updateNode(node.id, { disabled: !node.disabled })}
            >
              <div
                className={cn(
                  'w-4 h-4 bg-white rounded-full transition-transform',
                  node.disabled && 'translate-x-4'
                )}
              />
            </div>
          </label>
          <p className="text-xs text-gray-500">
            Disabled nodes are skipped during execution.
          </p>
        </Section>

        {/* Output (if executed) */}
        {executionState?.output && (
          <Section title="Output" icon={<Code className="w-4 h-4 text-gray-400" />}>
            <pre className="p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto">
              {JSON.stringify(executionState.output, null, 2)}
            </pre>
          </Section>
        )}

        {/* Error (if any) */}
        {executionState?.error && (
          <Section title="Error" icon={<AlertCircle className="w-4 h-4 text-red-400" />}>
            <div className="p-3 bg-red-900/30 rounded-lg text-sm text-red-300">
              {executionState.error}
            </div>
          </Section>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800">
        <button
          onClick={() => {/* Test node */}}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <Play className="w-4 h-4" />
          Test Node
        </button>
        <div className="flex-1" />
        <button
          onClick={handleDuplicate}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
};

export default NodeConfigPanel;
