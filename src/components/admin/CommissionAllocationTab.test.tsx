import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn(), rpc: vi.fn(), inserted: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke }, from: mocks.from, rpc: mocks.rpc },
}));
import CommissionAllocationTab from "./CommissionAllocationTab";

afterEach(cleanup);
const person = (id: string, name: string, role: string, panchayaths: string[]) => ({
  id, source: "pennyekart_agents", name, mobile: "9000000000", role, ward: null, is_active: true,
  panchayaths: panchayaths.map((p) => ({ id: p, name: p, district: null })),
});

const mockQuery = (data: unknown) => {
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "in", "lte", "gte"]) {
    query[method] = () => query;
  }
  query.insert = (values: unknown) => { mocks.inserted(values); return query; };
  query.maybeSingle = async () => ({ data: Array.isArray(data) && data.length === 0 ? null : data, error: null });
  query.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve);
  return query;
};

describe("commission allocation cards", () => {
  it("fetches, calculates, saves, and reveals a person's area communities", async () => {
    mocks.from.mockImplementation((table: string) => mockQuery(
      table === "profiles" ? [{ user_id: "creator-1", local_body_id: "body-1", ward_number: 7 }]
        : table === "locations_local_bodies" ? [{ id: "body-1", name: "Kodur" }] : [],
    ));
    mocks.invoke.mockResolvedValue({ data: { people: [
      person("1", "Anu", "coordinator", ["Kodur"]),
      person("2", "Biju", "pro", ["Ponmala"]),
    ], blocked_tables: [] }, error: null });
    mocks.rpc.mockResolvedValue({ data: [{
      community_id: "community-1", community_name: "Kodur Circle", creator_user_id: "creator-1",
      creator_name: "Creator", member_count: 4, order_count: 3, revenue: 1200, cost: 700, profit: 500,
    }], error: null });
    render(<CommissionAllocationTab roles={[]} rules={{}} fallbackRate={10} />);
    fireEvent.click(await screen.findByRole("button", { name: /Coordinator/ }));
    expect(screen.queryByRole("button", { name: /Pro/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Kodur")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Anu/ }));
    expect(screen.getByText("Kodur")).toBeInTheDocument();
    expect(screen.getByText("Kodur Circle")).toBeInTheDocument();
    expect(screen.getByText("Profit ₹500")).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith("elife-role-allocations");
    expect(mocks.rpc).toHaveBeenCalledWith("get_community_revenue_summary", expect.any(Object));
    expect(mocks.inserted).toHaveBeenCalledWith(expect.objectContaining({
      period_key: expect.any(String), total_profit: 500, total_commission: 50,
    }));
  });

  it("loads the saved period snapshot without fetching e-Life again", async () => {
    mocks.from.mockImplementation((table: string) => mockQuery(table === "commission_allocation_snapshots" ? {
      created_at: "2026-10-20T00:00:00Z", blocked_tables: [],
      people: [{ ...person("1", "Anu", "coordinator", ["Kodur"]), rate: 10, communities: [], profit: 0, commission: 0 }],
    } : []));
    render(<CommissionAllocationTab roles={[]} rules={{}} fallbackRate={10} />);
    expect(await screen.findByRole("button", { name: /Coordinator/ })).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
