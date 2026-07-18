import { execAsync } from '../lib/exec'

export interface WingetInstallResult {
  success: boolean
  message: string
}

export async function wingetInstall(packageId: string): Promise<WingetInstallResult> {
  // A system-wide install can take minutes; blocking the main process for that
  // long would freeze the entire interface.
  const result = await execAsync('winget', ['install', '--id', packageId, '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements'], 10 * 60 * 1000)
  if (!result.ok) {
    return { success: false, message: (result.stderr || result.stdout || 'winget failed').trim() }
  }
  return { success: true, message: result.stdout }
}
