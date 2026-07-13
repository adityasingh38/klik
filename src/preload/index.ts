import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('klik', {})
