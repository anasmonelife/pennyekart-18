import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { shareOrDownload } from "./exportFile";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// Native platform switch controlled per-test by the exportFile module's
// Capacitor import.
let nativeMode = false;
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => nativeMode },
}));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: vi.fn() },
  Directory: { Cache: "CACHE" },
}));
vi.mock("@capacitor/share", () => ({
  Share: { share: vi.fn() },
}));

const stubObjectUrls = () => {
  const createObjectURL = vi.fn(() => "blob:mock");
  (globalThis.URL as any).createObjectURL = createObjectURL;
  (globalThis.URL as any).revokeObjectURL = vi.fn();
  return { createObjectURL };
};

const makeNav = (canShare?: (d: ShareData) => boolean, share?: (d: ShareData) => Promise<void>) =>
  vi.stubGlobal("navigator", { canShare, share });

beforeEach(() => {
  nativeMode = false;
  vi.mocked(Filesystem.writeFile).mockReset().mockResolvedValue({ uri: "file:///cache/users.csv" } as never);
  vi.mocked(Share.share).mockReset().mockResolvedValue({} as never);
});

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

  it("writes the file to the app cache and opens the native share sheet in the app", async () => {
    nativeMode = true;
    const result = await shareOrDownload(
      new Blob(["id,name"], { type: "text/csv" }),
      "users_all 2026.csv",
      { title: "Users report" }
    );
    expect(result).toBe("shared");
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(1);
    const args = vi.mocked(Filesystem.writeFile).mock.calls[0][0];
    expect(args.path).toBe("users_all_2026.csv");
    expect(args.directory).toBe(Directory.Cache);
    expect(args.data.length).toBeGreaterThan(0);
    expect(Share.share).toHaveBeenCalledWith({
      title: "Users report",
      url: "file:///cache/users.csv",
      dialogTitle: "Users report",
    });
    // The web blob-download path must not run in the app.
    expect(document.body.querySelector("a")).toBeNull();
  });

  it("falls back to the web path when native sharing fails", async () => {
    nativeMode = true;
    stubObjectUrls();
    vi.mocked(Share.share).mockRejectedValue(new Error("no activity found"));
    const result = await shareOrDownload(new Blob(["a"]), "users.csv", { title: "Users" });
    expect(result).toBe("downloaded");
  });

  it("treats a cancelled native share as shared", async () => {
    nativeMode = true;
    vi.mocked(Share.share).mockRejectedValue(Object.assign(new Error("cancelled"), { name: "AbortError" }));
    const result = await shareOrDownload(new Blob(["a"]), "users.csv", { title: "Users" });
    expect(result).toBe("shared");
  });
});

// Keep the real Capacitor import referenced so the mock wiring is exercised.
expect(Capacitor.isNativePlatform()).toBe(false);
