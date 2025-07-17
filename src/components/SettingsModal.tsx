import React, { useState } from 'react';
import { X, Plus, Trash2, Settings, Bot, Zap, Save, Download, Upload, Play, CheckCircle, XCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { AIModelConfig, AgentConfig } from '../types/settings';
import { cn } from '../utils';
import { createOllamaService } from '../services/ollamaService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSettings,
    addAIModel,
    updateAIModel,
    removeAIModel,
    addAgent,
    updateAgent,
    removeAgent,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<'models' | 'agents' | 'general'>('models');
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [connectionResults, setConnectionResults] = useState<Map<string, { success: boolean; message: string }>>(new Map());

  if (!isOpen) return null;

  const testConnection = async (model: AIModelConfig) => {
    setTestingConnections(prev => new Set([...prev, model.id]));
    setConnectionResults(prev => new Map([...prev, [model.id, { success: false, message: 'Testing...' }]]));
    
    try {
      const service = createOllamaService(model);
      const healthCheck = await service.healthCheck();
      
      setConnectionResults(prev => new Map([...prev, [model.id, { 
        success: healthCheck.healthy, 
        message: healthCheck.healthy ? 'Connection successful!' : (healthCheck.error || 'Connection failed') 
      }]]));
    } catch (error) {
      setConnectionResults(prev => new Map([...prev, [model.id, { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      }]]));
    } finally {
      setTestingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(model.id);
        return newSet;
      });
    }
  };

  const handleAddModel = () => {
    const newModel: AIModelConfig = {
      id: `model-${Date.now()}`,
      name: 'New Model',
      provider: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'llama3',
      temperature: 0.7,
      maxTokens: 4096,
      isEnabled: true,
    };
    addAIModel(newModel);
    setEditingModel(newModel);
  };

  const handleAddAgent = () => {
    const newAgent: AgentConfig = {
      id: `agent-${Date.now()}`,
      name: 'New Agent',
      role: 'planner',
      description: 'New agent description',
      aiModel: settings.ai.models[0]?.id || '',
      systemPrompt: 'You are a helpful AI assistant.',
      isEnabled: true,
    };
    addAgent(newAgent);
    setEditingAgent(newAgent);
  };

  const handleExportSettings = () => {
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-editor-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (importSettings(content)) {
            alert('Settings imported successfully!');
          } else {
            alert('Failed to import settings. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const renderModelsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-editor-text">AI Models</h3>
        <button
          onClick={handleAddModel}
          className="flex items-center gap-2 px-3 py-1.5 bg-editor-accent hover:bg-editor-accent-hover text-white rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Model
        </button>
      </div>

      <div className="space-y-3">
        {settings.ai.models.map((model) => (
          <div
            key={model.id}
            className="border border-editor-border rounded-lg p-4 bg-editor-tab"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-editor-text">{model.name}</h4>
                <p className="text-sm text-editor-text-secondary">{model.provider} - {model.model}</p>
                <p className="text-sm text-editor-text-secondary">{model.endpoint}</p>
                {connectionResults.has(model.id) && (
                  <div className={cn(
                    "flex items-center gap-2 mt-2 text-sm",
                    connectionResults.get(model.id)?.success ? "text-green-500" : "text-red-500"
                  )}>
                    {connectionResults.get(model.id)?.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>{connectionResults.get(model.id)?.message}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => testConnection(model)}
                  disabled={testingConnections.has(model.id)}
                  className="p-1 rounded hover:bg-editor-border transition-colors disabled:opacity-50"
                  title="Test connection"
                >
                  {testingConnections.has(model.id) ? (
                    <div className="w-4 h-4 border-2 border-editor-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 text-editor-accent" />
                  )}
                </button>
                <button
                  onClick={() => setEditingModel(model)}
                  className="p-1 rounded hover:bg-editor-border transition-colors"
                >
                  <Settings className="w-4 h-4 text-editor-text-secondary" />
                </button>
                <button
                  onClick={() => removeAIModel(model.id)}
                  className="p-1 rounded hover:bg-editor-border transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-editor-sidebar border border-editor-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-editor-text mb-4">Edit AI Model</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Name</label>
                <input
                  type="text"
                  value={editingModel.name}
                  onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Provider</label>
                <select
                  value={editingModel.provider}
                  onChange={(e) => setEditingModel({ ...editingModel, provider: e.target.value as any })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                >
                  <option value="ollama">Ollama</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Endpoint</label>
                <input
                  type="url"
                  value={editingModel.endpoint}
                  onChange={(e) => setEditingModel({ ...editingModel, endpoint: e.target.value })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Model</label>
                <input
                  type="text"
                  value={editingModel.model}
                  onChange={(e) => setEditingModel({ ...editingModel, model: e.target.value })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Temperature</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={editingModel.temperature}
                  onChange={(e) => setEditingModel({ ...editingModel, temperature: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Max Tokens</label>
                <input
                  type="number"
                  min="1"
                  value={editingModel.maxTokens}
                  onChange={(e) => setEditingModel({ ...editingModel, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingModel(null)}
                className="px-4 py-2 bg-editor-tab hover:bg-editor-border text-editor-text rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateAIModel(editingModel.id, editingModel);
                  setEditingModel(null);
                }}
                className="px-4 py-2 bg-editor-accent hover:bg-editor-accent-hover text-white rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAgentsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-editor-text">AI Agents</h3>
        <button
          onClick={handleAddAgent}
          className="flex items-center gap-2 px-3 py-1.5 bg-editor-accent hover:bg-editor-accent-hover text-white rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      <div className="space-y-3">
        {settings.ai.agents.map((agent) => (
          <div
            key={agent.id}
            className="border border-editor-border rounded-lg p-4 bg-editor-tab"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-editor-accent" />
                  <h4 className="font-medium text-editor-text">{agent.name}</h4>
                  <span className="px-2 py-1 text-xs bg-editor-border rounded text-editor-text">
                    {agent.role}
                  </span>
                </div>
                <p className="text-sm text-editor-text-secondary mt-1">{agent.description}</p>
                <p className="text-sm text-editor-text-secondary">
                  Model: {settings.ai.models.find(m => m.id === agent.aiModel)?.name || 'Unknown'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingAgent(agent)}
                  className="p-1 rounded hover:bg-editor-border transition-colors"
                >
                  <Settings className="w-4 h-4 text-editor-text-secondary" />
                </button>
                <button
                  onClick={() => removeAgent(agent.id)}
                  className="p-1 rounded hover:bg-editor-border transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-editor-sidebar border border-editor-border rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-editor-text mb-4">Edit Agent</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Name</label>
                <input
                  type="text"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Role</label>
                <select
                  value={editingAgent.role}
                  onChange={(e) => setEditingAgent({ ...editingAgent, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                >
                  <option value="planner">Planner</option>
                  <option value="verifier">Verifier</option>
                  <option value="implementer">Implementer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">Description</label>
                <input
                  type="text"
                  value={editingAgent.description}
                  onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">AI Model</label>
                <select
                  value={editingAgent.aiModel}
                  onChange={(e) => setEditingAgent({ ...editingAgent, aiModel: e.target.value })}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text"
                >
                  {settings.ai.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-editor-text mb-1">System Prompt</label>
                <textarea
                  value={editingAgent.systemPrompt}
                  onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded focus:outline-none focus:border-editor-accent text-editor-text resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingAgent(null)}
                className="px-4 py-2 bg-editor-tab hover:bg-editor-border text-editor-text rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateAgent(editingAgent.id, editingAgent);
                  setEditingAgent(null);
                }}
                className="px-4 py-2 bg-editor-accent hover:bg-editor-accent-hover text-white rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-editor-text mb-4">AI Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-editor-text">Enable Web Search</label>
              <p className="text-xs text-editor-text-secondary">Allow agents to search the internet</p>
            </div>
            <input
              type="checkbox"
              checked={settings.ai.enableWebSearch}
              onChange={(e) => updateSettings({
                ai: { ...settings.ai, enableWebSearch: e.target.checked }
              })}
              className="w-4 h-4"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-editor-text">Enable Terminal Access</label>
              <p className="text-xs text-editor-text-secondary">Allow agents to execute terminal commands</p>
            </div>
            <input
              type="checkbox"
              checked={settings.ai.enableTerminalAccess}
              onChange={(e) => updateSettings({
                ai: { ...settings.ai, enableTerminalAccess: e.target.checked }
              })}
              className="w-4 h-4"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-editor-text">Enable File Operations</label>
              <p className="text-xs text-editor-text-secondary">Allow agents to create and modify files</p>
            </div>
            <input
              type="checkbox"
              checked={settings.ai.enableFileOperations}
              onChange={(e) => updateSettings({
                ai: { ...settings.ai, enableFileOperations: e.target.checked }
              })}
              className="w-4 h-4"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-editor-text mb-4">Import/Export</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportSettings}
            className="flex items-center gap-2 px-4 py-2 bg-editor-tab hover:bg-editor-border text-editor-text rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Settings
          </button>
          <button
            onClick={handleImportSettings}
            className="flex items-center gap-2 px-4 py-2 bg-editor-tab hover:bg-editor-border text-editor-text rounded transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Settings
          </button>
          <button
            onClick={resetSettings}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-editor-sidebar border border-editor-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-editor-border">
          <h2 className="text-xl font-semibold text-editor-text">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-editor-border transition-colors"
          >
            <X className="w-5 h-5 text-editor-text" />
          </button>
        </div>

        <div className="flex h-full">
          <div className="w-48 border-r border-editor-border p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('models')}
                className={cn(
                  "w-full text-left px-3 py-2 rounded transition-colors",
                  activeTab === 'models'
                    ? "bg-editor-accent text-white"
                    : "text-editor-text hover:bg-editor-tab"
                )}
              >
                <Bot className="w-4 h-4 inline mr-2" />
                AI Models
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={cn(
                  "w-full text-left px-3 py-2 rounded transition-colors",
                  activeTab === 'agents'
                    ? "bg-editor-accent text-white"
                    : "text-editor-text hover:bg-editor-tab"
                )}
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Agents
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={cn(
                  "w-full text-left px-3 py-2 rounded transition-colors",
                  activeTab === 'general'
                    ? "bg-editor-accent text-white"
                    : "text-editor-text hover:bg-editor-tab"
                )}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                General
              </button>
            </nav>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'models' && renderModelsTab()}
            {activeTab === 'agents' && renderAgentsTab()}
            {activeTab === 'general' && renderGeneralTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 