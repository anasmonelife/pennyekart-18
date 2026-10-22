// Mobile-safe file export:
// - Native app (Capacitor): write the file to the app cache and open the OS
//   share sheet via @capacitor/share — Android WebView cannot download blobs.
// - Mobile web: prefer the OS share sheet (works on iOS/Android browsers where
//   blob-link downloads are blocked), fall back to a download link that is
//   attached to the DOM first (required by iOS Safari).
import { Capacitor } from "@capacitor/core";

export type ShareOrDownloadResult = "shared" | "downloaded";

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read export file"));
    reader.readAsDataURL(blob);
  });

const shareViaNative = async (
  blob: Blob,
  fileName: string,
  opts: { title: string; text?: string }
): Promise<ShareOrDownloadResult> => {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const data = await blobToBase64(blob);
  // Share targets can mangle spaces; keep the name filesystem-safe.
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const file = await Filesystem.writeFile({
    path: safeName,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({
    title: opts.title,
    ...(opts.text ? { text: opts.text } : {}),
    url: file.uri,
    dialogTitle: opts.title,
  });
  return "shared";
};

export const shareOrDownload = async (
  blob: Blob,
  fileName: string,
  opts: { title: string; preferShare?: boolean; text?: string }
): Promise<ShareOrDownloadResult> => {
  if (Capacitor.isNativePlatform()) {
    try {
      return await shareViaNative(blob, fileName, opts);
    } catch (e: any) {
      // Share sheet dismissed without a target still counts as handled.
      if (e?.name === "AbortError" || /cancell?ed/i.test(String(e?.message ?? ""))) return "shared";
      // Otherwise fall through to the web paths below.
    }
  }
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
