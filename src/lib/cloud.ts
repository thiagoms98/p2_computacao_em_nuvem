import { BlobServiceClient } from "@azure/storage-blob";
import { google } from "googleapis";

export const GOOGLE_DOCS = "application/vnd.google-apps.document";
export const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
export const GOOGLE_SLIDES = "application/vnd.google-apps.presentation";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
};

export function getDriveClient() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!encoded && !raw) {
    throw new Error("Configure GOOGLE_SERVICE_ACCOUNT_JSON no arquivo .env.local.");
  }

  let credentials: Record<string, string>;
  try {
    credentials = JSON.parse(encoded ? Buffer.from(encoded, "base64").toString("utf8") : raw!);
  } catch {
    throw new Error("A credencial JSON do Google está inválida.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export function getDriveFolderId() {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("Configure GOOGLE_DRIVE_FOLDER_ID no arquivo .env.local.");
  return id;
}

export async function listDriveFiles() {
  const drive = getDriveClient();
  const folderId = getDriveFolderId();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime)",
      pageSize: 1000,
      orderBy: "name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
    });
    for (const file of response.data.files ?? []) {
      if (file.id && file.name && file.mimeType !== "application/vnd.google-apps.folder") {
        files.push({ id: file.id, name: file.name, mimeType: file.mimeType ?? "application/octet-stream", size: file.size ?? undefined, modifiedTime: file.modifiedTime ?? undefined });
      }
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

export function getBlobContainer() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER;
  if (!connectionString) throw new Error("Configure AZURE_STORAGE_CONNECTION_STRING no arquivo .env.local.");
  if (!containerName) throw new Error("Configure AZURE_STORAGE_CONTAINER no arquivo .env.local.");
  return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName);
}

export function isGoogleWorkspaceFile(mimeType: string) {
  return [GOOGLE_DOCS, GOOGLE_SHEET, GOOGLE_SLIDES].includes(mimeType);
}

export function getExportName(file: DriveFile) {
  if (file.mimeType === GOOGLE_DOCS) return `${file.name}.pdf`;
  if (file.mimeType === GOOGLE_SHEET) return `${file.name}.pdf`;
  if (file.mimeType === GOOGLE_SLIDES) return `${file.name}.pdf`;
  return file.name;
}
