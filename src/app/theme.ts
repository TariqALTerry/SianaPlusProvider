import { create } from 'zustand'
import { readItem, writeItem } from '@/lib/storage'

export type Theme = 'light' | 'dark' | 'system'

function systemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && systemDark())
  document.documentElement.classList.toggle('dark', dark)
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useTheme = create<ThemeState>()((set) => ({
  theme: readItem<Theme>('theme', 'system'),
  setTheme: (theme) => {
    writeItem('theme', theme)
    applyTheme(theme)
    set({ theme })
  },
}))

applyTheme(useTheme.getState().theme)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useTheme.getState().theme === 'system') applyTheme('system')
})
