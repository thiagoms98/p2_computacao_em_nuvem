import { NextResponse } from "next/server";
import { getDriveClient, getBlobContainer, getExportName, isGoogleWorkspaceFile, listDriveFiles } from "@/lib/cloud";

export const runtime = "nodejs";
export const maxDuration = 300;

type TransferResult = { id: string; name: string; blobName?: string; status: "success" | "error"; message: string };

export async function POST() {
  try {
    const drive = getDriveClient();
    const container = getBlobContainer();
    await container.createIfNotExists();
    const files = await listDriveFiles();
    const results: TransferResult[] = [];

    for (const file of files) {
      const blobName = getExportName(file);
      try {
        const media = isGoogleWorkspaceFile(file.mimeType)
          ? await drive.files.export({ fileId: file.id, mimeType: "application/pdf" }, { responseType: "stream" })
          : await drive.files.get({ fileId: file.id, alt: "media", supportsAllDrives: true }, { responseType: "stream" });
        const blockBlob = container.getBlockBlobClient(blobName);
        await blockBlob.uploadStream(media.data as NodeJS.ReadableStream, 4 * 1024 * 1024, 5, {
          blobHTTPHeaders: { blobContentType: isGoogleWorkspaceFile(file.mimeType) ? "application/pdf" : file.mimeType },
        });
        const result: TransferResult = { id: file.id, name: file.name, blobName, status: "success", message: "Transferido com sucesso" };
        results.push(result);
        console.log(`[SUCESSO] ${file.name} → ${blobName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha na transferência";
        results.push({ id: file.id, name: file.name, blobName, status: "error", message });
        console.error(`[ERRO] ${file.name}: ${message}`);
      }
    }

    return NextResponse.json({ results, total: files.length, succeeded: results.filter((item) => item.status === "success").length, failed: results.filter((item) => item.status === "error").length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível iniciar a migração.";
    console.error(`[ERRO] Migração: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
