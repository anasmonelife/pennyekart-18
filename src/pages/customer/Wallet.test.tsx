import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" }, loading: false }) }));
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
    fireEvent.click(await screen.findByRole("tab", { name: /Sales commission/i }));
    console.log("DOM:", document.body.innerHTML.slice(0, 3000)); await waitFor(() => expect(screen.getByText("Kodur Circle")).toBeInTheDocument());
    expect(screen.getByText(/Creator/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-09-01/i)).toBeInTheDocument();
    expect(screen.getByText("+₹50.00")).toBeInTheDocument();
    expect(screen.getByText(/Paid /)).toBeInTheDocument();
  });

  it("shows the empty state when nothing has been allocated", async () => {
    mocks.from.mockImplementation(() => mockQuery([]));
    render(<CustomerWallet />);
    fireEvent.click(await screen.findByRole("tab", { name: /Sales commission/i }));
    await waitFor(() => expect(screen.getByText("No sales commission yet")).toBeInTheDocument());
  });
});
