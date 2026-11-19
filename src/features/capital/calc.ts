export interface CashInputs {
  injected: number;
  received: number;
  expenses: number;
  withdrawn: number;
}

export interface CashPositionResult {
  injected: number;
  received: number;
  expenses: number;
  withdrawn: number;
  total: number;
}

export function cashPosition(inputs: CashInputs): CashPositionResult {
  const { injected, received, expenses, withdrawn } = inputs;
  const total = injected + received - expenses - withdrawn;
  return {
    injected,
    received,
    expenses,
    withdrawn,
    total,
  };
}

/**
 * Computes partner equity share percentage.
 *
 * POLICY CHOICE:
 * When a partner's net capital is <= 0 (zero investment or net over-withdrawn):
 * 1. Their share percentage is 0.0% (excluded from active equity pool).
 * 2. They are excluded from the positive equity denominator.
 * 3. The denominator `positiveTotalNet` is the sum of positive partner nets (sum_{p, net > 0} net_p).
 * 4. Each partner with positive net has share = (partnerNet / positiveTotalNet) * 100.
 * 5. If positiveTotalNet <= 0 (firm has zero positive partner capital), returns null.
 */
export function capitalShare(partnerNet: number, positiveTotalNet: number): number | null {
  if (positiveTotalNet <= 0) return null;
  if (partnerNet <= 0) return 0.0;
  const share = (partnerNet / positiveTotalNet) * 100;
  return Math.round(share * 10) / 10;
}
