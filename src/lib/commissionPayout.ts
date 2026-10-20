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