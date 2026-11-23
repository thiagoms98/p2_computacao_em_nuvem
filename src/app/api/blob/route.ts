import { NextResponse } from "next/server";
import { getBlobContainer } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const container = getBlobContainer();
    const blobs = [];
    for await (const blob of container.listBlobsFlat()) {
      blobs.push({ name: blob.name, size: blob.properties.contentLength ?? 0, modifiedTime: blob.properties.lastModified?.toISOString() });
    }
    return NextResponse.json({ blobs, container: process.env.AZURE_STORAGE_CONTAINER });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível listar o Azure Blob Storage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const container = getBlobContainer();
    const result = await container.createIfNotExists();
    return NextResponse.json({
      container: container.containerName,
      created: result.succeeded,
      message: result.succeeded ? "Container criado como privado." : "O container já existia.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o container no Azure.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
