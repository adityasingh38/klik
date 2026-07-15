import type { KlikApi } from '../../../preload'

declare global {
  interface Window {
    klik: KlikApi
  }
}

export const klikApi = window.klik
