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
  SkillInstallPreview,
  SkillInstallRequest,
  SkillInstallStepResult,
  SkillPreflightRequest
} from '../shared/catalog'

const klikApi = {
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
  uninstallSkill: (skillId: string): Promise<void> => ipcRenderer.invoke('klik:uninstallSkill', skillId)
}

export type KlikApi = typeof klikApi

contextBridge.exposeInMainWorld('klik', klikApi)
