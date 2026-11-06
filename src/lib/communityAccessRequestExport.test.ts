import { describe, expect, it } from "vitest";
import { buildCommunityAccessRequestsCsv } from "./communityAccessRequestExport";

describe("buildCommunityAccessRequestsCsv", () => {
  it("exports request details with CSV-safe quoting", () => {
    const csv = buildCommunityAccessRequestsCsv([{
      applicant: "Asha Nair",
      mobile: "9497589094",
      community: "Kodur Group",
      area: "Panchayath: Kodur · Ward 7",
      reason: 'Please add, "our family"',
      status: "pending",
      submittedAt: "2026-11-06T09:00:00.000Z",
      adminNotes: "",
    }]);

    expect(csv).toContain('"Applicant","Mobile","Community"');
    expect(csv).toContain('"Please add, ""our family"""');
    expect(csv).toContain('"Panchayath: Kodur · Ward 7"');
  });

  it("neutralizes spreadsheet formulas in exported values", () => {
    const csv = buildCommunityAccessRequestsCsv([{
      applicant: "=IMPORTDATA(\"https://example.invalid\")",
      mobile: "",
      community: "Test",
      area: "",
      reason: "",
      status: "pending",
      submittedAt: "",
      adminNotes: "",
    }]);

    expect(csv).toContain("'=IMPORTDATA");
  });
});