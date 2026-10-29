// Prefill rules for the create-community form (customer profile tab).
// Name: "{creator name}-w{ward number}-{last 4 digits of mobile}" — each part
// only when known. Description: the creator's panchayath (local body) name,
// filled separately from locations_local_bodies.

export const defaultCommunityName = (
  fullName: string | null,
  wardNumber: number | null,
  mobileNumber: string | null,
) => {
  const name = (fullName ?? "").trim();
  if (!name) return "";
  const digits = (mobileNumber ?? "").replace(/\D/g, "");
  const parts = [name];
  if (wardNumber != null && wardNumber > 0) parts.push(`w${wardNumber}`);
  if (digits.length >= 4) parts.push(digits.slice(-4));
  return parts.join("-");
};
