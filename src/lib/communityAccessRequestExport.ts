export interface CommunityAccessRequestExportRow {
  applicant: string;
  mobile: string;
  community: string;
  area: string;
  reason: string;
  status: string;
  submittedAt: string;
  adminNotes: string;
}

const csvCell = (value: string) => {
  const normalized = String(value ?? "").replace(/\r?\n/g, " ");
  const safe = /^[\t ]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function buildCommunityAccessRequestsCsv(rows: CommunityAccessRequestExportRow[]) {
  const header = ["Applicant", "Mobile", "Community", "Panchayath / ward", "Reason", "Status", "Submitted", "Admin notes"];
  const records = rows.map(row => [
    row.applicant, row.mobile, row.community, row.area, row.reason, row.status, row.submittedAt, row.adminNotes,
  ]);
  return [header, ...records].map(record => record.map(csvCell).join(",")).join("\r\n");
}