import { create } from 'zustand'
import { readItem, writeItem } from '@/lib/storage'
import { STORAGE_KEY } from './config'

interface Saved {
  conversationId: string | null
  briefSeenOn: string | null
}

interface AssistantPanelState extends Saved {
  open: boolean
  /** A question to send as soon as the panel is ready (from a brief item or another page). */
  pendingQuestion: string | null
  setOpen: (open: boolean) => void
  toggle: () => void
  setConversation: (id: string | null) => void
  markBriefSeen: (day: string) => void
  ask: (question: string) => void
  takePending: () => string | null
}

const saved = readItem<Saved>(STORAGE_KEY, { conversationId: null, briefSeenOn: null })

function persist(state: Saved) {
  writeItem(STORAGE_KEY, { conversationId: state.conversationId, briefSeenOn: state.briefSeenOn })
}

/** The panel's client state: open or not, the current conversation (kept across reloads), and the morning brief's day. */
export const useAssistantPanel = create<AssistantPanelState>()((set, get) => ({
  open: false,
  conversationId: saved.conversationId,
  briefSeenOn: saved.briefSeenOn,
  pendingQuestion: null,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  setConversation: (conversationId) => {
    set({ conversationId })
    persist({ ...get(), conversationId })
  },
  markBriefSeen: (briefSeenOn) => {
    set({ briefSeenOn })
    persist({ ...get(), briefSeenOn })
  },
  ask: (pendingQuestion) => set({ pendingQuestion, open: true }),
  takePending: () => {
    const question = get().pendingQuestion
    if (question) set({ pendingQuestion: null })
    return question
  },
}))
