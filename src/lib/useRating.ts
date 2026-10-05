import { useCallback, useEffect, useState } from 'react';
import { ratingsApi, type RatingType } from '../api/ratings';
import { useToast } from '../state/ToastContext';

interface RatingState {
  my: number;
  avg: number;
  count: number;
  canRate: boolean;
}

/**
 * Local rating state for one catalog entity. Ratings are completion-gated on
 * the server (403 NOT_COMPLETED) — we surface that as a friendly toast.
 */
export function useRating(
  type: RatingType,
  id: string,
  initial: { my: number; avg: number; count: number; canRate: boolean },
) {
  const { toast } = useToast();
  const [state, setState] = useState<RatingState>({
    my: initial.my,
    avg: initial.avg,
    count: initial.count,
    canRate: initial.canRate,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState({
      my: initial.my,
      avg: initial.avg,
      count: initial.count,
      canRate: initial.canRate,
    });
    // Only re-sync when the scalar values change (avoid object identity loops).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.my, initial.avg, initial.count, initial.canRate]);

  const rate = useCallback(
    async (stars: number) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await ratingsApi.rate(type, id, stars);
        setState((s) => ({ ...s, my: res.myRating, avg: res.avg, count: res.count }));
        toast('Rating saved — thanks!', 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not save rating';
        toast(
          msg.includes('completed')
            ? 'Finish this item first to unlock rating'
            : msg,
          'error',
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, toast, type, id],
  );

  return { ...state, rate, busy };
}
