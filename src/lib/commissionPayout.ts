export interface CommissionPayment {
  id: string;
  community_id: string;
  community_name: string;
  customer_user_id: string;
  period_from: string;
  period_to: string;
  total_profit: number;
  commission_rate: number;
  calculated_commission: number;
  amount: number;
  created_at: string;
}

export const commissionAmount = (profit: number, rate: number) =>
  Math.round(Math.max(profit, 0) * rate) / 100;

export const overlapsCommissionPeriod = (
  payment: Pick<CommissionPayment, "period_from" | "period_to">,
  from: string,
  to: string,
) => payment.period_from <= to && payment.period_to >= from;

export const commissionDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

export const commissionRange = (from: string, to: string) => ({
  from: new Date(`${from}T00:00:00+05:30`).toISOString(),
  to: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86400000 - 1).toISOString(),
});

/** Percentage of sales commission the platform holds back and never pays out. */
export const PAYOUT_HOLD_PERCENT = 20;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Amount still requestable: 80% of total commission minus pending/verified/approved requests. */
export const payoutRequestable = (totalCommission: number, committed: number) => {
  const payable = round2(Math.max(totalCommission, 0) * (100 - PAYOUT_HOLD_PERCENT) / 100);
  return Math.max(0, round2(payable - Math.max(committed, 0)));
};

export const payoutHeld = (totalCommission: number) =>
  round2(Math.max(totalCommission, 0) * PAYOUT_HOLD_PERCENT / 100);