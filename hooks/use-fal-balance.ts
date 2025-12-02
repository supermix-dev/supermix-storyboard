'use client';

import { useCallback, useEffect, useState } from 'react';

type FalBalanceState = {
  balance: number | null;
  loading: boolean;
  error: string | null;
};

export function useFalBalance() {
  const [state, setState] = useState<FalBalanceState>({
    balance: null,
    loading: true,
    error: null,
  });

  const refreshBalance = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/fal-balance');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setState({
        balance: data.balance,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to fetch fal balance:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch balance',
      }));
    }
  }, []);

  // Fetch balance on mount
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return {
    balance: state.balance,
    loading: state.loading,
    error: state.error,
    refreshBalance,
  };
}
