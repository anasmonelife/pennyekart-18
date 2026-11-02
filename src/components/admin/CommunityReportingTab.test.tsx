import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/lib/commissionPayout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/commissionPayout")>()),
  commissionDate: () => "2026-11-01",
}));
import CommunityReportingTab from "./CommunityReportingTab";

beforeEach(() => { mocks.from.mockClear(); mocks.rpc.mockClear(); mocks.toast.success.mockClear(); mocks.toast.error.mockClear(); });
afterEach(cleanup);

const row = (over: Record<string, unknown>) => ({
  id: "a1", community_id: "c1", community_name: "Kodur Circle", customer_user_id: "u1",
  recipient_type: "creator", recipient_name: "Anu", recipient_mobile: "9000000000",
  total_profit: 500, commission_rate: 10, calculated_commission: 50, amount: 50,
  original_amount: null, revision_count: 0, revised_at: null, share_count: 1,
  period_from: "2026-10-01", period_to: "2026-11-01",
  status: "allocated", allocated_at: "2026-11-01T05:00:00Z", created_at: "2026-11-01T05:00:00Z",
  ...over,
});

const pendingRow = () => row({ id: "p1", community_name: "Ponmala Group", status: "pending", allocated_at: null, period_from: "2026-11-01", period_to: "2026-11-01" });

const mockQuery = (data: unknown) => {
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "order", "lte", "gte"]) query[method] = () => query;
  query.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve);
  return query;
};

describe("commission reporting cancel/undo", () => {
  it("undoes an allocated transaction and records the wallet debit", async () => {
    mocks.from.mockImplementation(() => mockQuery([row({}), pendingRow()]));
    mocks.rpc.mockResolvedValue({ data: 50, error: null });
    render(<CommunityReportingTab />);
    expect(await screen.findByText("Kodur Circle")).toBeInTheDocument();

    // Pending rows offer no undo; only allocated ones do.
    const undoButtons = screen.getAllByRole("button", { name: /Undo/ });
    expect(undoButtons).toHaveLength(1);

    fireEvent.click(undoButtons[0]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Cancel & undo transaction");
    expect(dialog).toHaveTextContent("Wallet debit");
    expect(dialog).toHaveTextContent("−₹50.00");

    fireEvent.click(screen.getByRole("button", { name: /Cancel transaction/ }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("cancel_commission_allocation", { _id: "a1" }));
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith(
      expect.stringContaining("₹50.00 debited from the wallet"),
    ));
  });

  it("hides cancel actions when nothing is allocated yet", async () => {
    mocks.from.mockImplementation(() => mockQuery([pendingRow()]));
    render(<CommunityReportingTab />);
    expect(await screen.findByText("Ponmala Group")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Undo/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel & undo/ })).toBeDisabled();
  });

  it("surfaces the server refusal when the wallet was already spent", async () => {
    mocks.from.mockImplementation(() => mockQuery([row({})]));
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Wallet balance ₹10.00 is too low to cancel ₹50.00 — the customer has spent part of this commission" } });
    render(<CommunityReportingTab />);
    fireEvent.click(await screen.findByRole("button", { name: /Undo/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Cancel transaction/ }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Wallet balance ₹10.00 is too low"),
    ));
  });
});
