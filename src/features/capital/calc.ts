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

export function capitalShare(partnerNet: number, totalNet: number): number | null {
  if (totalNet <= 0) return null;
  const share = (partnerNet / totalNet) * 100;
  return Math.round(share * 10) / 10;
}
