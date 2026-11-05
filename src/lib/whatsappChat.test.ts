import { describe, it, expect } from "vitest";
import { whatsappDigits, whatsappChatLink } from "./appLinks";
describe("whatsapp chat", () => {
  it("adds 91 to 10-digit numbers", () => expect(whatsappDigits("98765 43210")).toBe("919876543210"));
  it("strips leading 0", () => expect(whatsappDigits("09876543210")).toBe("919876543210"));
  it("keeps +91 numbers", () => expect(whatsappDigits("+91 9876543210")).toBe("919876543210"));
  it("rejects short numbers", () => expect(whatsappDigits("12345")).toBeNull());
  it("encodes message", () => expect(whatsappChatLink("919876543210", "Hi & bye")).toBe("https://wa.me/919876543210?text=Hi%20%26%20bye"));
});
