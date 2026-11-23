import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drive para Blob | Migração de arquivos",
  description: "Migre arquivos do Google Drive para o Azure Blob Storage.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
