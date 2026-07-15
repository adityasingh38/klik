import { contextBridge, ipcRenderer } from 'electron'
import type {
  ClientInfo,
  GetServersResult,
  InstallRequest,
  InstallStepResult,
  InstalledServerRecord
} from '../shared/types'

const klikApi = {
  getServers: (): Promise<GetServersResult> => ipcRenderer.invoke('klik:getServers'),
  getClients: (): Promise<ClientInfo[]> => ipcRenderer.invoke('klik:getClients'),
  getInstalled: (): Promise<InstalledServerRecord[]> => ipcRenderer.invoke('klik:getInstalled'),
  install: (request: InstallRequest): Promise<InstallStepResult[]> => ipcRenderer.invoke('klik:install', request),
  uninstall: (serverId: string): Promise<void> => ipcRenderer.invoke('klik:uninstall', serverId)
}

export type KlikApi = typeof klikApi

contextBridge.exposeInMainWorld('klik', klikApi)
