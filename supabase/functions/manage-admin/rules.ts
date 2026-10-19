export interface TargetProfile {
  user_id: string;
  is_super_admin: boolean;
  role_id: string | null;
  email: string | null;
}

/** Same rule as the Admins tab: a role, a real email, and not a super admin. */
export const isAddedAdmin = (p: { is_super_admin: boolean; role_id: string | null; email: string | null }) =>
  !p.is_super_admin && !!p.role_id && !!p.email && !/@pennyekart\.(in|local)$/i.test(p.email.trim());

/** Returns an error message when the caller may not edit/delete the target, otherwise null. */
export const targetError = (callerId: string, callerIsSuperAdmin: boolean, target: TargetProfile | null): string | null => {
  if (!callerIsSuperAdmin) return "Only super admins can edit or delete admins";
  if (!target) return "Admin not found";
  if (target.user_id === callerId) return "You cannot edit or delete your own account here";
  if (target.is_super_admin) return "Super admin accounts cannot be changed here";
  if (!isAddedAdmin(target)) return "This account is not an admin";
  return null;
};

export interface AdminUpdate {
  full_name: string;
  email: string;
  mobile_number: string | null;
  role_id: string;
}

export const parseUpdate = (body: Record<string, unknown>): AdminUpdate | string => {
  const full_name = String(body.full_name ?? "").trim().slice(0, 100);
  const email = String(body.email ?? "").trim().toLowerCase();
  const mobileRaw = String(body.mobile_number ?? "").trim();
  const role_id = body.role_id ? String(body.role_id) : "";
  if (!full_name) return "Name is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return "Enter a valid email";
  if (/@pennyekart\.(in|local)$/i.test(email)) return "Use the admin's real email address";
  if (mobileRaw && !/^\+?\d{10,15}$/.test(mobileRaw.replace(/[\s-]/g, ""))) return "Enter a valid mobile number";
  if (!role_id) return "Select a role";
  return { full_name, email, mobile_number: mobileRaw ? mobileRaw.replace(/[\s-]/g, "") : null, role_id };
};
