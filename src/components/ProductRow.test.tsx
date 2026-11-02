import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductRow from "./ProductRow";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

const products = [
  { id: "p1", name: "Rice 5kg", price: 300, rating: 4.5, image: "x.jpg" },
  { id: "p2", name: "Atta 10kg", price: 450, rating: 4.2, image: "y.jpg" },
];

describe("ProductRow strip layout", () => {
  it("renders the strip with the default multi-row grid classes", () => {
    render(<ProductRow title="Featured" products={products} />);
    const strip = screen.getByText("Rice 5kg").closest("div.grid");
    expect(strip).not.toBeNull();
    expect(strip!.className).toContain("grid-flow-col");
    expect(strip!.className).toContain("grid-rows-2");
    expect(strip!.className).toContain("md:grid-rows-2");
    expect(strip!.className).toContain("lg:grid-rows-2");
  });
});
