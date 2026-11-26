import { Sparkles } from 'lucide-react'
import type { StaffAssistantActionResponse, StaffAssistantMessageResponse } from '@/api/types'
import { cn } from '@/lib/utils'
import { isSafeRoute } from '../context'
import { ActionCard } from './ActionCard'
import { AssistantCardView } from './Cards'

/** Light formatting: paragraphs and **bold**, nothing else (the text is the model's, never HTML). */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-wrap break-words [&:not(:first-child)]:mt-2">
          {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </p>
      ))}
    </>
  )
}

export function MessageView({
  message,
  conversationId,
  onNavigate,
  onAsk,
  onActionResult,
}: {
  message: StaffAssistantMessageResponse
  conversationId: string
  onNavigate: (route: string) => void
  onAsk: (q: string) => void
  onActionResult: (action: StaffAssistantActionResponse, follow: StaffAssistantMessageResponse | null) => void
}) {
  const mine = message.role === 'User'
  if (mine) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-ee-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
          <RichText text={message.text} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-primary text-white shadow-sm">
        <Sparkles className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {message.text && (
          <div className="w-fit max-w-full rounded-2xl rounded-ss-sm border bg-surface px-3.5 py-2 text-sm leading-relaxed shadow-sm">
            <RichText text={message.text} />
          </div>
        )}
        {message.card?.type === 'action' && message.card.action ? (
          <ActionCard action={message.card.action} conversationId={conversationId} onResult={onActionResult} onNavigate={onNavigate} />
        ) : message.card ? (
          <AssistantCardView card={message.card} onNavigate={onNavigate} onAsk={onAsk} />
        ) : null}
        {message.links.filter((l) => isSafeRoute(l.route)).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.links.filter((l) => isSafeRoute(l.route)).map((l) => (
              <button
                key={l.route}
                type="button"
                onClick={() => onNavigate(l.route)}
                className={cn('rounded-full border border-primary/30 bg-primary-soft/50 px-2.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft')}
              >
                {l.label} ←
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** The reply while it is being written: the text so far, or what the assistant is doing. */
export function LiveReply({ text, status }: { text: string; status: string }) {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-primary text-white shadow-sm">
        <Sparkles className="size-3.5 animate-pulse" />
      </div>
      <div className="w-fit max-w-[85%] rounded-2xl rounded-ss-sm border bg-surface px-3.5 py-2 text-sm leading-relaxed shadow-sm">
        {text ? (
          <span className="whitespace-pre-wrap break-words">
            {text}
            <span className="ms-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-primary/70" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary" />
            </span>
            <span className="text-xs">{status}</span>
          </span>
        )}
      </div>
    </div>
  )
}
