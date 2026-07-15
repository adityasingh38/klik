import type {
  ClientInfo,
  InstallRequest,
  InstallStepResult,
  InstalledServerRecord,
  MergedServerEntry
} from '../../../shared/types'

declare global {
  interface Window {
    klik: {
      getServers: () => Promise<MergedServerEntry[]>
      getClients: () => Promise<ClientInfo[]>
      getInstalled: () => Promise<InstalledServerRecord[]>
      install: (request: InstallRequest) => Promise<InstallStepResult[]>
    }
  }
}

export const klikApi = window.klik
