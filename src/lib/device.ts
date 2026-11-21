const plain = (value: string) => value.toLowerCase().replace(/\s+/g, '')

/**
 * A device in one line: its name, then the brand and model only when the name doesn't already say them (tester
 * item 24): "Samsung Galaxy A54" with brand "Samsung" and model "Galaxy A54" reads once, not
 * "Samsung Galaxy A54 · Samsung · Galaxy A54". The comparison ignores case and spacing, like the app's
 * `deviceDetails`. Empty when there is nothing to show.
 */
export function deviceLine(
  name: string | null | undefined,
  brand: string | null | undefined,
  model: string | null | undefined,
  separator = ' · ',
): string {
  const parts: string[] = []
  const own = plain(name ?? '')
  if (name?.trim()) parts.push(name.trim())
  for (const value of [brand, model]) {
    const v = value?.trim() ?? ''
    if (!v) continue
    if (own.includes(plain(v))) continue
    if (parts.some((p) => plain(p) === plain(v))) continue
    parts.push(v)
  }
  return parts.join(separator)
}
