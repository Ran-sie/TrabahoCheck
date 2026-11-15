import { useEffect, useState } from 'react'
import { fetchAiReview } from './api'
import type { AiReview } from './types'

export type AiState =
  | { status: 'off'; review: null }
  | { status: 'loading'; review: null }
  | { status: 'failed'; review: null }
  | { status: 'ready'; review: AiReview }

/**
 * Loads the AI review for a check. `off` means the AI is not turned on,
 * `failed` means it did not answer (the page then falls back to the rule score).
 */
export function useAiReview(reviewId: string | null): AiState {
  const [state, setState] = useState<{ id: string; review: AiReview | null } | null>(null)

  useEffect(() => {
    if (!reviewId) return
    let cancelled = false
    void fetchAiReview(reviewId).then((review) => {
      if (!cancelled) setState({ id: reviewId, review })
    })
    return () => {
      cancelled = true
    }
  }, [reviewId])

  if (!reviewId) return { status: 'off', review: null }
  if (state?.id !== reviewId) return { status: 'loading', review: null }
  return state.review ? { status: 'ready', review: state.review } : { status: 'failed', review: null }
}
