import { describe, it, expect, vi, afterEach } from "vitest";
import { shareOrDownload } from "./exportFile";

const stubObjectUrls = () => {
  (globalThis.URL as any).createObjectURL = vi.fn(() => "blob:mock");
  (globalThis.URL as any).revokeObjectURL = vi.fn();
};

const makeNav = (canShare?: (d: ShareData) => boolean, share?: (d: ShareData) => Promise<void>) =>
  vi.stubGlobal("navigator", { canShare, share });

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("shareOrDownload", () => {
  it("shares the file when the browser supports file sharing", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    makeNav(() => true, share);
    const result = await shareOrDownload(new Blob(["a,b"], { type: "text/csv" }), "users.csv", { title: "Users" });
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("treats a closed share sheet as shared, without downloading", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("abort"), { name: "AbortError" }));
    makeNav(() => true, share);
    const result = await shareOrDownload(new Blob(["a"]), "users.csv", { title: "Users" });
    expect(result).toBe("shared");
    expect(document.body.querySelector("a")).toBeNull();
  });

  it("downloads via an attached link when file sharing is unavailable", async () => {
    makeNav(undefined, undefined); // no canShare
    const result = await shareOrDownload(new Blob(["a"]), "users.csv", { title: "Users" });
    expect(result).toBe("downloaded");
    const link = document.body.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("download")).toBe("users.csv");
  });

  it("falls back to download when sharing is declined", async () => {
    const share = vi.fn().mockRejectedValue(new Error("denied"));
    makeNav(() => true, share);
    const result = await shareOrDownload(new Blob(["a"]), "users.csv", { title: "Users" });
    expect(result).toBe("downloaded");
    expect(document.body.querySelector("a")).not.toBeNull();
  });
});
