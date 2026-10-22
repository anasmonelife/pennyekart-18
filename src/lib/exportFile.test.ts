import { describe, it, expect, vi, afterEach } from "vitest";
import { shareOrDownload } from "./exportFile";

const stubObjectUrls = () => {
  const createObjectURL = vi.fn(() => "blob:mock");
  (globalThis.URL as any).createObjectURL = createObjectURL;
  (globalThis.URL as any).revokeObjectURL = vi.fn();
  return { createObjectURL };
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
    const { createObjectURL } = stubObjectUrls();
    makeNav(undefined, undefined); // no canShare
    const blob = new Blob(["a"], { type: "text/csv" });
    const result = await shareOrDownload(blob, "users.csv", { title: "Users" });
    expect(result).toBe("downloaded");
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("falls back to download when sharing is declined", async () => {
    const { createObjectURL } = stubObjectUrls();
    const share = vi.fn().mockRejectedValue(new Error("denied"));
    makeNav(() => true, share);
    const result = await shareOrDownload(new Blob(["a"]), "users.csv", { title: "Users" });
    expect(result).toBe("downloaded");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});
