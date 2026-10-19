import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
import CommissionAllocationTab from "./CommissionAllocationTab";

afterEach(cleanup);
const person = (id: string, name: string, role: string, panchayaths: string[]) => ({
  id, source: "pennyekart_agents", name, mobile: "9000000000", role, ward: null, is_active: true,
  panchayaths: panchayaths.map((p) => ({ id: p, name: p, district: null })),
});

describe("commission allocation cards", () => {
  it("opens a role card and reveals a person's panchayaths on tap", async () => {
    mocks.invoke.mockResolvedValue({ data: { people: [
      person("1", "Anu", "coordinator", ["Kodur"]),
      person("2", "Biju", "pro", ["Ponmala"]),
    ], blocked_tables: [] }, error: null });
    render(<CommissionAllocationTab roles={[]} rules={{}} fallbackRate={10} />);
    fireEvent.click(await screen.findByRole("button", { name: /Coordinator/ }));
    expect(screen.queryByRole("button", { name: /Pro/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Kodur")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Anu/ }));
    expect(screen.getByText("Kodur")).toBeInTheDocument();
  });
});
