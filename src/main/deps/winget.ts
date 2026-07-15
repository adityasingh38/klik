import { spawnSync } from 'node:child_process'

export interface WingetInstallResult {
  success: boolean
  message: string
}

export function wingetInstall(packageId: string): WingetInstallResult {
  const result = spawnSync(
    'winget',
    ['install', '--id', packageId, '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements'],
    { encoding: 'utf-8' }
  )
  if (result.error) {
    return { success: false, message: result.error.message }
  }
  if (result.status !== 0) {
    return { success: false, message: result.stderr || result.stdout || `winget exited with code ${result.status}` }
  }
  return { success: true, message: result.stdout }
}
