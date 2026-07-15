import { contextBridge, ipcRenderer } from 'electron'
import type {
  ClientInfo,
  InstallRequest,
  InstallStepResult,
  InstalledServerRecord,
  MergedServerEntry
} from '../shared/types'

const klikApi = {
  getServers: (): Promise<MergedServerEntry[]> => ipcRenderer.invoke('klik:getServers'),
  getClients: (): Promise<ClientInfo[]> => ipcRenderer.invoke('klik:getClients'),
  getInstalled: (): Promise<InstalledServerRecord[]> => ipcRenderer.invoke('klik:getInstalled'),
  install: (request: InstallRequest): Promise<InstallStepResult[]> => ipcRenderer.invoke('klik:install', request)
}

export type KlikApi = typeof klikApi

contextBridge.exposeInMainWorld('klik', klikApi)
