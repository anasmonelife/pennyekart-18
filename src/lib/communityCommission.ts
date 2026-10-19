export interface CommissionRule {
  minimum: number;
  maximum: number;
  rate: number;
}

export const isValidCommissionRule = (rule: CommissionRule) =>
  Number.isFinite(rule.minimum) &&
  Number.isFinite(rule.maximum) &&
  Number.isFinite(rule.rate) &&
  rule.minimum >= 0 &&
  rule.maximum <= 100 &&
  rule.minimum <= rule.maximum &&
  rule.rate >= rule.minimum &&
  rule.rate <= rule.maximum;

export const commissionRateForRole = (
  roleId: string | null,
  rules: Record<string, CommissionRule>,
  fallbackRate: number,
) => {
  const rule = roleId ? rules[roleId] : undefined;
  return rule && isValidCommissionRule(rule) ? rule.rate : fallbackRate;
};

export const commissionForProfit = (
  profit: number,
  roleId: string | null,
  rules: Record<string, CommissionRule>,
  fallbackRate: number,
) => (profit * commissionRateForRole(roleId, rules, fallbackRate)) / 100;