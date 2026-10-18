import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { qk } from '@/api/keys'
import { PageSkeleton } from '@/components/States'
import { notificationHref, notificationsApi } from '@/features/notifications/api'

/**
 * `/n/:notificationId?referenceType&referenceId&title` — where a click on a browser notification lands
 * (PHASE2 §8). Inside the auth guard, so a signed-out user logs in and comes back. Marks it read
 * (failure ignored), then replaces itself with the platform page, or the notifications list otherwise.
 */
export function NotificationRedirectPage() {
  const { notificationId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const done = useRef(false)
  // The title tells the tracking alerts apart (they open the item's tracking tab).
  const href = notificationHref({ referenceType: params.get('referenceType'), referenceId: params.get('referenceId'), title: params.get('title') })

  useEffect(() => {
    if (done.current) return
    done.current = true
    if (notificationId) {
      void notificationsApi
        .markRead(notificationId)
        .then(() => queryClient.invalidateQueries({ queryKey: qk.notifications }))
        .catch(() => undefined)
    }
    navigate(href ?? '/notifications', { replace: true })
  }, [href, navigate, notificationId, queryClient])

  return notificationId ? <PageSkeleton /> : <Navigate to="/notifications" replace />
}
