import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), read: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }) }) } }));
vi.mock("./CommunityCard", () => ({ default: () => <div data-testid="community" /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import CommunityAccessSection from "./CommunityAccessSection";

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.read.mockResolvedValue({ data: null, error: null }); });
describe("community access profile flow", () => {
  it("shows community only when the server grants access", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    render(<CommunityAccessSection userId="customer-1" />);
    expect(await screen.findByTestId("community")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("can_use_community");
    expect(screen.queryByRole("button", { name: "Request access" })).not.toBeInTheDocument();
  });
  it("sends the request with one button and no community name or reason fields", async () => {
    mocks.rpc.mockImplementation(async (fn: string) => ({ data: fn === "can_use_community" ? false : "request-1", error: null }));
    render(<CommunityAccessSection userId="customer-1" />);
    await screen.findByRole("button", { name: "Request access" });
    expect(screen.queryByLabelText(/community name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request access" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("request_community_access"));
    expect(screen.queryByTestId("community")).not.toBeInTheDocument();
  });
  it("does not offer another submission while a request is pending", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mocks.read.mockResolvedValue({ data: { status: "pending", admin_notes: null }, error: null });
    render(<CommunityAccessSection userId="customer-1" />);
    await waitFor(() => expect(mocks.read).toHaveBeenCalled());
    await screen.findByText(/awaiting administrator review/);
    expect(screen.queryByRole("button", { name: "Request access" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("community")).not.toBeInTheDocument();
  });
});
