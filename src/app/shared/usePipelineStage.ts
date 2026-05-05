import { useCallback, useRef } from 'react';

interface PendingResponse {
  status: 'pending';
  stage: string;
}

type TriggerResult<T> = T | PendingResponse;

function isPending(res: unknown): res is PendingResponse {
  return typeof res === 'object' && res !== null && (res as PendingResponse).status === 'pending';
}

interface UsePipelineStageOptions {
  pollIntervalMs?: number;
  maxAttempts?: number;
}

export function usePipelineStage(opts: UsePipelineStageOptions = {}) {
  const { pollIntervalMs = 3000, maxAttempts = 60 } = opts;
  const abortRef = useRef(false);

  const run = useCallback(
    async <T>(
      triggerFn: () => Promise<TriggerResult<T>>,
      pollFn: () => Promise<TriggerResult<T>>,
      isReady: (res: T) => boolean,
      onReady: (res: T) => void,
      onError?: (err: unknown) => void,
    ): Promise<void> => {
      abortRef.current = false;
      try {
        const res = await triggerFn();

        if (!isPending(res) && isReady(res as T)) {
          onReady(res as T);
          return;
        }

        // 202 pending — poll until ready
        for (let i = 0; i < maxAttempts; i++) {
          if (abortRef.current) return;
          await new Promise(r => setTimeout(r, pollIntervalMs));
          try {
            const poll = await pollFn();
            if (!isPending(poll) && isReady(poll as T)) {
              onReady(poll as T);
              return;
            }
          } catch (pollErr) {
            // isReady threw (e.g. backend reported an error) — surface immediately
            throw pollErr;
          }
        }
      } catch (err) {
        onError?.(err);
      }
    },
    [pollIntervalMs, maxAttempts],
  );

  const abort = useCallback(() => { abortRef.current = true; }, []);

  return { run, abort };
}
