import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke }, from: mocks.from, rpc: mocks.rpc },
}));
import AgentAreaReport from "./AgentAreaReport";

beforeEach(() => { mocks.invoke.mockClear(); mocks.from.mockClear(); mocks.rpc.mockClear(); });
afterEach(cleanup);

const person = (id: string, name: string, role: string, panchayaths: string[], extra: Record<string, unknown> = {}) => ({
  id, source: "pennyekart_agents", name, mobile: "9000000000", role, ward: null, is_active: true,
  panchayaths: panchayaths.map((p) => ({ id: p, name: p, district: null })), ...extra,
});

const mockQuery = (data: unknown) => {
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "in", "lte", "gte"]) {
    query[method] = () => query;
  }
  query.maybeSingle = async () => ({ data: Array.isArray(data) && data.length === 0 ? null : data, error: null });
  query.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve);
  return query;
};

const community = (id: string, name: string, creator: string, profit: number) => ({
  community_id: id, community_name: name, creator_user_id: creator, creator_name: `${creator} name`,
  member_count: 4, order_count: 3, revenue: profit * 3, cost: profit * 2, profit, unmatched_items: 0,
});

describe("agent area report", () => {
  it("selects a role then an agent and shows the communities under their allocated panchayaths", async () => {
    mocks.invoke.mockResolvedValue({ data: { people: [
      person("1", "Sajna", "super admin partner", ["Kodur", "Ponmala"]),
      person("2", "Anu", "coordinator", ["Kodur"], { ward: 7 }),
      person("3", "Biju", "pro", ["Ponmala"]),
    ], blocked_tables: [] }, error: null });
    mocks.rpc.mockResolvedValue({ data: [
      community("c1", "Kodur Circle", "creator-1", 500),
      community("c2", "Ponmala Bazaar", "creator-2", 300),
    ], error: null });
    mocks.from.mockImplementation((table: string) => mockQuery(
      table === "profiles"
        ? [{ user_id: "creator-1", local_body_id: "body-1", ward_number: 7 }, { user_id: "creator-2", local_body_id: "body-2", ward_number: 2 }]
        : table === "locations_local_bodies"
          ? [{ id: "body-1", name: "Kodur" }, { id: "body-2", name: "Ponmala" }]
          : [],
    ));

    render(<AgentAreaReport />);

    const roleSelect = (await screen.findByLabelText("Role")) as HTMLSelectElement;
    expect(roleSelect.value).toBe("super admin partner");
    fireEvent.change(roleSelect, { target: { value: "coordinator" } });
    const agentSelect = screen.getByLabelText("Agent") as HTMLSelectElement;
    fireEvent.change(agentSelect, { target: { value: "2" } });
    // Coordinators cover only their responsible ward inside the panchayath.
    expect(screen.getByText("Kodur Circle")).toBeInTheDocument();
    expect(screen.queryByText("Ponmala Bazaar")).not.toBeInTheDocument();
    expect(screen.getAllByText("Ward 7").length).toBeGreaterThan(0);
    const rows = screen.getAllByRole("row");
    expect(within(rows[rows.length - 1]).getByText("₹500")).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith("elife-role-allocations");
    expect(mocks.rpc).toHaveBeenCalledWith("get_community_revenue_summary", expect.any(Object));

    fireEvent.change(roleSelect, { target: { value: "super admin partner" } });
    fireEvent.change(agentSelect, { target: { value: "1" } });
    expect(screen.getByText("Kodur Circle")).toBeInTheDocument();
    expect(screen.getByText("Ponmala Bazaar")).toBeInTheDocument();
    expect(screen.getByText("Kodur · Ponmala")).toBeInTheDocument();
  });

  it("shows the empty state when no communities fall in the agent's area", async () => {
    mocks.invoke.mockResolvedValue({ data: { people: [person("1", "Sajna", "super admin partner", ["Kodur"])], blocked_tables: [] }, error: null });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.from.mockImplementation(() => mockQuery([]));

    render(<AgentAreaReport />);
    fireEvent.change(await screen.findByLabelText("Agent"), { target: { value: "1" } });
    expect(screen.getByText(/No communities in this agent's area/i)).toBeInTheDocument();
  });
});
