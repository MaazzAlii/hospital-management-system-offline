/**
 * Shared PDF fetch, download, and print utility using Fetch + Blob.
 * Executes in the existing authenticated window context so session cookies
 * are sent automatically and robustly across both Web and Electron desktop environments.
 */

export async function downloadPdfFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
    });

    if (!res.ok) {
      let errorDetail = "";
      try {
        errorDetail = await res.text();
      } catch {
        // ignore
      }
      const msg = `Failed to download PDF (${res.status} ${res.statusText})${
        errorDetail ? `: ${errorDetail}` : ""
      }`;
      throw new Error(msg);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Cleanup after download trigger
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (error) {
    console.error("[client-pdf] Error downloading PDF:", error);
    throw error;
  }
}

export async function printPdfDirect(url: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
    });

    if (!res.ok) {
      let errorDetail = "";
      try {
        errorDetail = await res.text();
      } catch {
        // ignore
      }
      const msg = `Failed to fetch PDF for printing (${res.status} ${res.statusText})${
        errorDetail ? `: ${errorDetail}` : ""
      }`;
      throw new Error(msg);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;

    iframe.onload = () => {
      setTimeout(() => {
        iframe.focus();
        iframe.contentWindow?.print();
        // Cleanup after print dialog closes
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      }, 300);
    };

    document.body.appendChild(iframe);
  } catch (error) {
    console.error("[client-pdf] Error printing PDF:", error);
    throw error;
  }
}
