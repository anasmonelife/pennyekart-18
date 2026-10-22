// Mobile-safe file export: prefer the OS share sheet (works on iOS/Android
// browsers where blob-link downloads are blocked), fall back to a download
// link that is attached to the DOM first (required by iOS Safari).
export type ShareOrDownloadResult = "shared" | "downloaded";

export const shareOrDownload = async (
  blob: Blob,
  fileName: string,
  opts: { title: string; preferShare?: boolean; text?: string }
): Promise<ShareOrDownloadResult> => {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (opts.preferShare !== false && typeof nav.canShare === "function") {
    try {
      const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: opts.title, ...(opts.text ? { text: opts.text } : {}) });
        return "shared";
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return "shared"; // user closed the share sheet
      // Anything else falls through to the download path below.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Keep the URL alive long enough for slow mobile browsers to start the save.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
};
