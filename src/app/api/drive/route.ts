import { NextResponse } from "next/server";
import { listDriveFiles } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const files = await listDriveFiles();
    return NextResponse.json({ files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível listar o Google Drive.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
