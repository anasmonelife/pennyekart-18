export const canNotifyCustomerAboutDelivery = (status: string, attemptedAt: string | null) =>
  !attemptedAt && !["delivered", "cancelled", "return_confirmed"].includes(status);