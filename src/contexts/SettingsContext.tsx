import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, DEFAULT_SETTINGS, AIModelConfig, AgentConfig } from '../types/settings';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addAIModel: (model: AIModelConfig) => void;
  updateAIModel: (id: string, updates: Partial<AIModelConfig>) => void;
  removeAIModel: (id: string) => void;
  addAgent: (agent: AgentConfig) => void;
  updateAgent: (id: string, updates: Partial<AgentConfig>) => void;
  removeAgent: (id: string) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('ai-editor-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        // Merge with defaults to ensure new settings are included
        setSettings(prev => ({
          ...prev,
          ...parsedSettings,
          ai: {
            ...prev.ai,
            ...parsedSettings.ai,
            models: parsedSettings.ai?.models || prev.ai.models,
            agents: parsedSettings.ai?.agents || prev.ai.agents,
          },
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ai-editor-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const addAIModel = (model: AIModelConfig) => {
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        models: [...prev.ai.models, model],
      },
    }));
  };

  const updateAIModel = (id: string, updates: Partial<AIModelConfig>) => {
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        models: prev.ai.models.map(model =>
          model.id === id ? { ...model, ...updates } : model
        ),
      },
    }));
  };

  const removeAIModel = (id: string) => {
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        models: prev.ai.models.filter(model => model.id !== id),
      },
    }));
  };

  const addAgent = (agent: AgentConfig) => {
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        agents: [...prev.ai.agents, agent],
      },
    }));
  };

  const updateAgent = (id: string, updates: Partial<AgentConfig>) => {
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        agents: prev.ai.agents.map(agent =>
          agent.id === id ? { ...agent, ...updates } : agent
        ),
      },
    }));
  };

  const removeAgent = (id: string) => {
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        agents: prev.ai.agents.filter(agent => agent.id !== id),
      },
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (settingsJson: string) => {
    try {
      const parsedSettings = JSON.parse(settingsJson);
      setSettings(parsedSettings);
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  };

  const value: SettingsContextType = {
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
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}; 