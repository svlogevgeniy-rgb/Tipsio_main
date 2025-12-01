'use client'

import { useTranslations as useNextIntlTranslations } from 'next-intl'

export const useTranslations = useNextIntlTranslations

// Helper to set locale cookie
export function setLocale(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`
  window.location.reload()
}
