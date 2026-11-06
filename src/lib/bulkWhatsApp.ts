import { whatsappDigits } from "@/lib/appLinks";

export interface WhatsAppMessageTemplate {
  label: string;
  text: (name: string) => string;
}

export interface BulkWhatsAppCustomer {
  user_id: string;
  full_name: string | null;
  mobile_number: string | null;
}

export const WHATSAPP_MESSAGE_TEMPLATES: WhatsAppMessageTemplate[] = [
  { label: "Greeting", text: (name) => `Hello ${name}, greetings from Pennyekart! How can we help you today?` },
  { label: "Special offer", text: (name) => `Hi ${name}, we have a special offer just for you on Pennyekart! Open the app to check today's deals: https://www.pennyekart.com` },
  { label: "Order follow-up", text: (name) => `Hi ${name}, this is Pennyekart. We wanted to check on your recent order. Is everything okay?` },
  { label: "We miss you", text: (name) => `Hi ${name}, we miss you at Pennyekart! Come back and shop your daily essentials with home delivery.` },
];

export const personalizeBulkWhatsAppMessage = (message: string, name: string | null): string =>
  message.split("{{name}}").join(name?.trim() || "there");

export const buildBulkWhatsAppQueue = <T extends BulkWhatsAppCustomer>(
  selectedUserIds: readonly string[],
  customers: readonly T[],
): { recipients: (T & { whatsappDigits: string })[]; skippedCount: number } => {
  const customerById = new Map(customers.map((customer) => [customer.user_id, customer]));
  const recipients: (T & { whatsappDigits: string })[] = [];
  let skippedCount = 0;

  for (const userId of selectedUserIds) {
    const customer = customerById.get(userId);
    const digits = whatsappDigits(customer?.mobile_number);
    if (!customer || !digits) {
      skippedCount += 1;
      continue;
    }
    recipients.push({ ...customer, whatsappDigits: digits });
  }

  return { recipients, skippedCount };
};