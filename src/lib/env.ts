/**
 * Optional contact details and store links. The backend has no endpoint for them, so (like the
 * mobile apps' `SIANA_SUPPORT_PHONE`) they come from the build environment; empty = not shown.
 */
const read = (value: unknown) => String(value ?? '').trim()

export const SUPPORT_PHONE = read(import.meta.env.VITE_SUPPORT_PHONE)
export const EXECUTOR_APP_IOS_URL = read(import.meta.env.VITE_EXECUTOR_APP_IOS_URL)
export const EXECUTOR_APP_ANDROID_URL = read(import.meta.env.VITE_EXECUTOR_APP_ANDROID_URL)
