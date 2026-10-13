import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { SAUDI_CITIES } from '@/lib/cities'

/** Free-text city with suggestions (Riyadh first); see `lib/cities.ts`. */
export const CityInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function CityInput(props, ref) {
  const listId = useId()
  return (
    <>
      <Input ref={ref} list={listId} maxLength={100} autoComplete="address-level2" {...props} />
      <datalist id={listId}>
        {SAUDI_CITIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  )
})
