import type {
  ClientInfo,
  GetServersResult,
  InstallRequest,
  InstallStepResult,
  InstalledServerRecord
} from '../../../shared/types'

declare global {
  interface Window {
    klik: {
      getServers: () => Promise<GetServersResult>
      getClients: () => Promise<ClientInfo[]>
      getInstalled: () => Promise<InstalledServerRecord[]>
      install: (request: InstallRequest) => Promise<InstallStepResult[]>
      uninstall: (serverId: string) => Promise<void>
    }
  }
}

export const klikApi = window.klik
