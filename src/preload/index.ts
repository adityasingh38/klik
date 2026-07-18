import { contextBridge, ipcRenderer } from 'electron'
import type {
  ClientInfo,
  GetServersResult,
  InstallPreview,
  InstallRequest,
  InstallStepResult,
  InstalledServerRecord,
  PreflightRequest
} from '../shared/types'
import type {
  DetectedTool,
  InstalledSkillRecord,
  PluginInstallPreview,
  PluginInstallRequest,
  PluginInstallStepResult,
  PluginPreflightRequest,
  SkillInstallPreview,
  SkillInstallRequest,
  SkillInstallStepResult,
  SkillPreflightRequest
} from '../shared/catalog'

interface InstalledPluginInfo {
  id: string
  version: string
  enabled: boolean
  installPath: string
}

const klikApi = {
  /**
   * The host platform, read synchronously so the UI can label shortcuts correctly
   * on first paint. Klik ships for Windows and macOS, and the modifier key differs.
   */
  platform: process.platform as NodeJS.Platform,

  getServers: (): Promise<GetServersResult> => ipcRenderer.invoke('klik:getServers'),
  getClients: (): Promise<ClientInfo[]> => ipcRenderer.invoke('klik:getClients'),
  getInstalled: (): Promise<InstalledServerRecord[]> => ipcRenderer.invoke('klik:getInstalled'),
  preflight: (request: PreflightRequest): Promise<InstallPreview> => ipcRenderer.invoke('klik:preflight', request),
  install: (request: InstallRequest): Promise<InstallStepResult[]> => ipcRenderer.invoke('klik:install', request),
  uninstall: (serverId: string): Promise<void> => ipcRenderer.invoke('klik:uninstall', serverId),

  getTools: (): Promise<DetectedTool[]> => ipcRenderer.invoke('klik:getTools'),
  getInstalledSkills: (): Promise<InstalledSkillRecord[]> => ipcRenderer.invoke('klik:getInstalledSkills'),
  skillPreflight: (request: SkillPreflightRequest): Promise<SkillInstallPreview> =>
    ipcRenderer.invoke('klik:skillPreflight', request),
  installSkill: (request: SkillInstallRequest): Promise<SkillInstallStepResult[]> =>
    ipcRenderer.invoke('klik:installSkill', request),
  uninstallSkill: (skillId: string): Promise<void> => ipcRenderer.invoke('klik:uninstallSkill', skillId),

  getInstalledPlugins: (): Promise<InstalledPluginInfo[]> => ipcRenderer.invoke('klik:getInstalledPlugins'),
  pluginPreflight: (request: PluginPreflightRequest): Promise<PluginInstallPreview> =>
    ipcRenderer.invoke('klik:pluginPreflight', request),
  installPlugin: (request: PluginInstallRequest): Promise<PluginInstallStepResult[]> =>
    ipcRenderer.invoke('klik:installPlugin', request),
  uninstallPlugin: (pluginId: string): Promise<PluginInstallStepResult[]> =>
    ipcRenderer.invoke('klik:uninstallPlugin', pluginId)
}

export type KlikApi = typeof klikApi

contextBridge.exposeInMainWorld('klik', klikApi)
