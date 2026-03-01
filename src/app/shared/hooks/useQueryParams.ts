import { useSearchParams } from 'react-router-dom';
import { useCallback, useRef } from 'react';

export function useQueryParams() {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsRef = useRef(searchParams);

    // Keep ref in sync with searchParams
    searchParamsRef.current = searchParams;

    const sessionId = searchParams.get('session');

    const updateParams = useCallback((session?: string) => {
        const currentSession = searchParamsRef.current.get('session');
        // Only update if the value actually changed
        if (session !== currentSession) {
            const params = new URLSearchParams(searchParamsRef.current);
            if (session) {
                params.set('session', session);
            } else {
                params.delete('session');
            }
            setSearchParams(params, { replace: true });
        }
    }, [setSearchParams]); // Only depend on setSearchParams, not searchParams

    return { sessionId, updateParams };
}
