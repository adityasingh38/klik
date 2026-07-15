import { spawnSync } from 'node:child_process'
import type { RuntimeKind } from '../../shared/types'

const WINGET_PACKAGE_IDS: Record<RuntimeKind, string | null> = {
  node: 'OpenJS.NodeJS.LTS',
  python: 'Python.Python.3.12',
  uv: 'astral-sh.uv',
  docker: null // not auto-installed in v1; detection only
}

const CHECK_COMMANDS: Record<RuntimeKind, string> = {
  node: 'node',
  python: 'python',
  uv: 'uv',
  docker: 'docker'
}

export function isRuntimeAvailable(runtime: RuntimeKind): boolean {
  const result = spawnSync('where', [CHECK_COMMANDS[runtime]], { encoding: 'utf-8' })
  return result.status === 0
}

export function wingetPackageId(runtime: RuntimeKind): string | null {
  return WINGET_PACKAGE_IDS[runtime]
}
