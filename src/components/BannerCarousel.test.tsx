import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), navigate: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));

import BannerCarousel from "./BannerCarousel";

afterEach(cleanup);

const renderCarousel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BannerCarousel />
    </QueryClientProvider>
  );

const banners = [
  { title: "Spice sale", image_url: "/img/spice.jpg", link_url: "https://www.pennyekart.com/category/Spices?sort=new", sort_order: 1, is_active: true },
  { title: "WhatsApp deal", image_url: "/img/wa.jpg", link_url: "https://wa.me/?text=hi", sort_order: 2, is_active: true },
];

const mockQuery = (data: unknown) => {
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "order"]) query[method] = () => query;
  query.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve);
  return query;
};

describe("banner links", () => {
  it("navigates internal banner links inside the app", async () => {
    mocks.from.mockImplementation(() => mockQuery(banners));
    renderCarousel();
    const links = await waitFor(() => {
      const els = screen.getAllByRole("link", { name: /Spice sale/i });
      for (const el of els) {
        expect(el).toHaveAttribute("href", "/category/Spices?sort=new");
        expect(el).not.toHaveAttribute("target", "_blank");
      }
      return els;
    });
    fireEvent.click(links[0]);
    expect(mocks.navigate).toHaveBeenCalledWith("/category/Spices?sort=new");
  });

  it("opens external banner links in a new tab", async () => {
    mocks.from.mockImplementation(() => mockQuery(banners));
    renderCarousel();
    await waitFor(() => expect(screen.getAllByRole("link", { name: /WhatsApp deal/i }).length).toBeGreaterThan(0));
    for (const external of screen.getAllByRole("link", { name: /WhatsApp deal/i })) {
      expect(external).toHaveAttribute("href", "https://wa.me/?text=hi");
      expect(external).toHaveAttribute("target", "_blank");
      expect(external).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
