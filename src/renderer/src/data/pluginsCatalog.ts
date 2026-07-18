import type { PluginEntry } from '../../../shared/catalog'

/**
 * A curated catalog of well-known plugins. Plugins are marketplace-sourced bundles
 * (commands, agents, hooks, skills, MCP servers). Today's plugin ecosystems are
 * Claude Code-centric, so these are real Claude Code marketplace plugins with their
 * real source repos; `compatibleTools` keeps the model open to other tools as their
 * plugin formats stabilize. Phase 3 wires the actual add-marketplace + enable engine.
 */
export const PLUGINS_CATALOG: PluginEntry[] = [
  {
    id: 'feature-dev@claude-plugins-official',
    title: 'Feature Dev',
    description: 'Guided feature development with codebase understanding and architecture-first agents.',
    marketplace: 'claude-plugins-official',
    marketplaceUrl: 'https://github.com/anthropics/claude-code',
    author: 'Anthropic',
    repositoryUrl: 'https://github.com/anthropics/claude-code',
    category: 'Development',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  },
  {
    id: 'code-review@claude-plugins-official',
    title: 'Code Review',
    description: 'Review pull requests for correctness, security, and performance with confidence-based filtering.',
    marketplace: 'claude-plugins-official',
    marketplaceUrl: 'https://github.com/anthropics/claude-code',
    author: 'Anthropic',
    repositoryUrl: 'https://github.com/anthropics/claude-code',
    category: 'Development',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  },
  {
    id: 'frontend-design@claude-plugins-official',
    title: 'Frontend Design',
    description: 'Guidance for distinctive, intentional visual design when building or reshaping UI.',
    marketplace: 'claude-plugins-official',
    marketplaceUrl: 'https://github.com/anthropics/claude-code',
    author: 'Anthropic',
    repositoryUrl: 'https://github.com/anthropics/claude-code',
    category: 'Design',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  },
  {
    id: 'gsap-skills@gsap-skills',
    title: 'GSAP Skills',
    description: 'Official GSAP animation skills — core, ScrollTrigger, timelines, React integration, performance.',
    marketplace: 'gsap-skills',
    marketplaceUrl: 'https://github.com/greensock/gsap-skills',
    author: 'GreenSock',
    repositoryUrl: 'https://github.com/greensock/gsap-skills',
    category: 'Animation',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  },
  {
    id: 'threejs-webgl@claude-design-skillstack',
    title: 'Three.js / WebGL',
    description: 'Build interactive 3D scenes and WebGL/WebGPU experiences — scenes, materials, lights, shaders.',
    marketplace: 'claude-design-skillstack',
    marketplaceUrl: 'https://github.com/freshtechbro/claudedesignskills',
    author: 'freshtechbro',
    repositoryUrl: 'https://github.com/freshtechbro/claudedesignskills',
    category: 'Design',
    compatibleTools: ['claude-code'],
    verified: false,
    warnings: ['Community marketplace — review the source before enabling.']
  },
  {
    id: 'vercel@claude-plugins-official',
    title: 'Vercel',
    description: 'Deploy, manage environments, and architect apps on Vercel from your AI client.',
    marketplace: 'claude-plugins-official',
    marketplaceUrl: 'https://github.com/anthropics/claude-code',
    author: 'Vercel',
    repositoryUrl: 'https://github.com/vercel/vercel',
    category: 'Deployment',
    compatibleTools: ['claude-code'],
    verified: true,
    warnings: []
  }
]
