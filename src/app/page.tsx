"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DriveFile = { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string };
type BlobItem = { name: string; size: number; modifiedTime?: string };
type Transfer = { id: string; name: string; blobName?: string; status: "success" | "error"; message: string };

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fileIcon = (mime: string) => mime.includes("pdf") ? "PDF" : mime.includes("image") ? "IMG" : mime.includes("spreadsheet") ? "XLS" : mime.includes("presentation") ? "PPT" : mime.includes("document") ? "DOC" : "FILE";

function GoogleMark() {
  return <span className="google-mark" aria-hidden="true"><i>G</i></span>;
}

function CloudIcon({ type }: { type: "drive" | "azure" }) {
  return type === "drive"
    ? <span className="drive-mark" aria-hidden="true"><span /><span /><span /></span>
    : <span className="azure-mark" aria-hidden="true"><i /><i /><i /></span>;
}

export default function Home() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [blobs, setBlobs] = useState<BlobItem[]>([]);
  const [container, setContainer] = useState("Azure Blob Storage");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [creatingContainer, setCreatingContainer] = useState(false);
  const [driveError, setDriveError] = useState("");
  const [blobError, setBlobError] = useState("");
  const [migrationError, setMigrationError] = useState("");
  const [containerMessage, setContainerMessage] = useState("");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filter, setFilter] = useState("");

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    const [driveResponse, blobResponse] = await Promise.all([
      fetch("/api/drive", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, data: await r.json() })).catch(() => ({ ok: false, data: { error: "Falha de conexão ao consultar o Google Drive." } })),
      fetch("/api/blob", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, data: await r.json() })).catch(() => ({ ok: false, data: { error: "Falha de conexão ao consultar o Azure." } })),
    ]);
    setDriveError(driveResponse.ok ? "" : driveResponse.data.error);
    setBlobError(blobResponse.ok ? "" : blobResponse.data.error);
    setFiles(driveResponse.ok ? driveResponse.data.files : []);
    setBlobs(blobResponse.ok ? blobResponse.data.blobs : []);
    if (blobResponse.data.container) setContainer(blobResponse.data.container);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void refresh(true); }, [refresh]);

  const visibleFiles = useMemo(() => files.filter((file) => file.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())), [files, filter]);
  const fileIdsTransferred = new Set(transfers.filter((item) => item.status === "success").map((item) => item.id));
  const successfulCount = transfers.filter((item) => item.status === "success").length;
  const failedCount = transfers.filter((item) => item.status === "error").length;

  async function migrate() {
    setMigrating(true);
    setMigrationError("");
    setTransfers([]);
    try {
      const response = await fetch("/api/migrate", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível iniciar a migração.");
      setTransfers(data.results ?? []);
      await refresh(true);
    } catch (error) {
      setMigrationError(error instanceof Error ? error.message : "Erro inesperado durante a migração.");
    } finally {
      setMigrating(false);
    }
  }

  async function createContainer() {
    setCreatingContainer(true);
    setContainerMessage("");
    setBlobError("");
    try {
      const response = await fetch("/api/blob", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível criar o container.");
      setContainerMessage(data.message);
      await refresh(true);
    } catch (error) {
      setBlobError(error instanceof Error ? error.message : "Erro ao criar o container.");
    } finally {
      setCreatingContainer(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="topbar">
        <div className="brand"><GoogleMark /><span className="brand-drive">Drive</span><span className="brand-divider">/</span><span className="brand-title">Migração para Azure</span></div>
        <div className="top-actions"><span className="secure-pill"><span className="secure-dot" /> Conexão segura</span><div className="avatar">A</div></div>
      </header>

      <section className="workspace">
        <div className="page-heading">
          <div><div className="eyebrow">FERRAMENTA DE MIGRAÇÃO</div><h1>Seus arquivos, em outro lugar.</h1><p>Copie arquivos do Google Drive para o Azure Blob Storage com poucos cliques.</p></div>
          <button className="refresh-button" onClick={() => void refresh()} disabled={refreshing || migrating} aria-label="Atualizar listas"><span className={refreshing ? "spin" : ""}>↻</span> Atualizar</button>
        </div>

        <div className="overview-grid">
          <div className="overview-card"><span className="overview-icon blue"><CloudIcon type="drive" /></span><div><span className="overview-label">ARQUIVOS NA ORIGEM</span><strong>{loading ? "…" : files.length}</strong><span className="overview-foot">Pasta conectada do Google Drive</span></div></div>
          <div className="overview-card"><span className="overview-icon cyan"><CloudIcon type="azure" /></span><div><span className="overview-label">ARQUIVOS NO DESTINO</span><strong>{loading ? "…" : blobs.length}</strong><span className="overview-foot">Container <b>{container}</b></span></div></div>
          <div className="overview-card"><span className="overview-icon green">✓</span><div><span className="overview-label">ÚLTIMA MIGRAÇÃO</span><strong>{transfers.length ? `${successfulCount} de ${transfers.length}` : "—"}</strong><span className="overview-foot">{failedCount ? `${failedCount} com erro` : transfers.length ? "Transferências concluídas" : "Nenhuma transferência nesta sessão"}</span></div></div>
        </div>

        <div className="transfer-card">
          <div className="section-head"><div><h2>Transferir arquivos</h2><p>Os arquivos da pasta configurada serão copiados para o container selecionado.</p></div><button className="primary-button" onClick={() => void migrate()} disabled={migrating || loading || files.length === 0}><span>{migrating ? <span className="spin">◌</span> : "↑"}</span>{migrating ? "Transferindo…" : `Migrar ${files.length} ${files.length === 1 ? "arquivo" : "arquivos"}`}</button></div>
          {(driveError || blobError || migrationError) && <div className="error-banner"><span>!</span><div>{driveError && <p><b>Google Drive:</b> {driveError}</p>}{blobError && <p><b>Azure:</b> {blobError}</p>}{migrationError && <p><b>Migração:</b> {migrationError}</p>}</div></div>}
          <div className="flow"><div className="flow-side"><CloudIcon type="drive" /><div><strong>Google Drive</strong><span>Origem</span></div></div><div className="flow-line"><span>→</span></div><div className="flow-side"><CloudIcon type="azure" /><div><strong>Azure Blob</strong><span>{container}</span></div></div><span className="flow-lock">♧ Conexão protegida no servidor</span></div>
          <div className="list-toolbar"><div className="list-title"><strong>Arquivos da pasta</strong><span>{files.length}</span></div><label className="searchbox"><span>⌕</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar arquivos" /></label></div>
          <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Tamanho</th><th>Modificado</th><th>Status</th></tr></thead><tbody>
            {loading ? <tr><td colSpan={5} className="empty-state">Carregando arquivos…</td></tr> : visibleFiles.length === 0 ? <tr><td colSpan={5} className="empty-state">{files.length ? "Nenhum arquivo corresponde à busca." : "Nenhum arquivo encontrado nesta pasta."}</td></tr> : visibleFiles.map((file) => {
              const transfer = transfers.find((item) => item.id === file.id);
              return <tr key={file.id}><td><div className="file-cell"><span className={`file-type ${fileIcon(file.mimeType).toLowerCase()}`}>{fileIcon(file.mimeType)}</span><span className="file-name" title={file.name}>{file.name}</span></div></td><td className="muted-cell">{file.mimeType.replace("application/vnd.google-apps.", "Google ").split("/").pop()}</td><td className="muted-cell">{file.size ? formatSize(Number(file.size)) : "—"}</td><td className="muted-cell">{formatDate(file.modifiedTime)}</td><td>{transfer ? <span className={`status ${transfer.status}`}>{transfer.status === "success" ? "✓ Transferido" : "! Erro"}</span> : fileIdsTransferred.has(file.id) ? <span className="status success">✓ Transferido</span> : <span className="status idle">Aguardando</span>}</td></tr>;
            })}
          </tbody></table></div>
          {transfers.length > 0 && failedCount > 0 && <div className="transfer-errors">{transfers.filter((item) => item.status === "error").map((item) => <p key={item.id}><b>{item.name}:</b> {item.message}</p>)}</div>}
          {migrating && <div className="progress-note"><span className="spin">◌</span> Estamos enviando os arquivos. Arquivos grandes podem levar alguns minutos.</div>}
        </div>

        <div className="destination-card"><div className="destination-leading"><span className="destination-icon"><CloudIcon type="azure" /></span><div><strong>Conteúdo no destino</strong><span>Arquivos que já existem no container Azure</span></div></div><span className="destination-count">{blobs.length} {blobs.length === 1 ? "arquivo" : "arquivos"}</span><button className="create-container-button" onClick={() => void createContainer()} disabled={creatingContainer || migrating}><span className={creatingContainer ? "spin" : ""}>{creatingContainer ? "◌" : "+"}</span>{creatingContainer ? "Preparando…" : "Criar container"}</button>{containerMessage && <div className="container-message">✓ {containerMessage}</div>}{blobs.length > 0 && <div className="blob-list">{blobs.slice(0, 5).map((blob) => <div className="blob-row" key={blob.name}><span className="blob-name">{blob.name}</span><span>{formatSize(blob.size)}</span><span>{formatDate(blob.modifiedTime)}</span></div>)}{blobs.length > 5 && <span className="more-blobs">e mais {blobs.length - 5} arquivos</span>}</div>}</div>

        <footer>As credenciais ficam no servidor e não são enviadas ao navegador. <span>Google Drive → Azure Blob Storage</span></footer>
      </section>
    </main>
  );
}
