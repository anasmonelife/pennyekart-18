import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
const fakeUser = { id: "user-1" };
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: fakeUser, loading: false }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));

import CustomerWallet from "./Wallet";

afterEach(cleanup);

const mockQuery = (data: unknown) => {
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "order"]) query[method] = () => query;
  query.maybeSingle = async () => ({ data: { id: "w1", balance: 250, min_usage_amount: 0 }, error: null });
  query.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve);
  return query;
};

const payments = [
  {
    id: "a1", community_name: "Kodur Circle", recipient_type: "creator",
    period_from: "2026-09-01", period_to: "2026-09-30", amount: 50,
    allocated_at: "2026-10-21T06:00:00Z", status: "allocated",
  },
];

describe("customer wallet sales commission tab", () => {
  it("lists allocated payouts with community, role, period and amount", async () => {
    mocks.from.mockImplementation((table: string) => mockQuery(table === "community_commission_allocations" ? payments : []));
    render(<CustomerWallet />);
    const tab = await screen.findByRole("tab", { name: /Sales commission/i }); fireEvent.mouseDown(tab); fireEvent.click(tab);
    await waitFor(() => expect(screen.getByText("Kodur Circle")).toBeInTheDocument());
    expect(screen.getByText(/Creator/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Sep 2026/)).toBeInTheDocument();
    expect(screen.getByText("+₹50.00")).toBeInTheDocument();
    expect(screen.getByText(/Paid /)).toBeInTheDocument();
  });

  it("shows the empty state when nothing has been allocated", async () => {
    mocks.from.mockImplementation(() => mockQuery([]));
    render(<CustomerWallet />);
    const tab = await screen.findByRole("tab", { name: /Sales commission/i }); fireEvent.mouseDown(tab); fireEvent.click(tab);
    await waitFor(() => expect(screen.getByText("No sales commission yet")).toBeInTheDocument());
  });

  it("shows the held and requestable totals with request status", async () => {
    const request = { id: "r1", customer_user_id: "user-1", requested_amount: 100, commission_total: 200, status: "pending", admin_notes: null, created_at: "2026-10-21T06:00:00Z" };
    mocks.from.mockImplementation((table: string) => mockQuery(table === "community_commission_allocations" ? [
      { ...payments[0], amount: 200 },
    ] : table === "commission_payout_requests" ? [request] : []));
    render(<CustomerWallet />);
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Sales commission/i }));
    fireEvent.click(screen.getByRole("tab", { name: /Sales commission/i }));
    expect(await screen.findByText("₹200.00")).toBeInTheDocument();
    expect(screen.getByText("₹40.00")).toBeInTheDocument();
    expect(screen.getByText("₹60.00")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request payout/i })).toBeEnabled();
  });

  it("submits payout requests through the protected RPC", async () => {
    mocks.from.mockImplementation((table: string) => mockQuery(table === "community_commission_allocations" ? [
      { ...payments[0], amount: 200 },
    ] : []));
    mocks.rpc.mockResolvedValue({ data: "request-1", error: null });
    render(<CustomerWallet />);
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Sales commission/i }));
    fireEvent.click(screen.getByRole("tab", { name: /Sales commission/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Request payout/i }));
    fireEvent.click(screen.getByRole("button", { name: /Submit request/i }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("request_commission_payout", { _amount: 160 }));
  });
});
