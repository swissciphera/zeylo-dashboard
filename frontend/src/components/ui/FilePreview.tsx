import { useEffect, useState } from 'react';
import { Download, FileText, FileWarning } from 'lucide-react';
import { clientApi } from '@/lib/api';

interface FileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

const PREVIEWABLE = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
]);

// Fetches the protected file as a blob (so the Authorization header is sent)
// and previews PDF/image/text inline. Falls back to a download card otherwise.
export function FilePreview({ file }: { file: FileMeta }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const canPreview = PREVIEWABLE.has(file.mimeType);

  useEffect(() => {
    let revoke: string | null = null;
    if (!canPreview) return;
    clientApi
      .get(`/app/files/${file.id}/preview`, { responseType: 'blob' })
      .then(async (res) => {
        if (file.mimeType.startsWith('text/')) {
          setTextContent(await res.data.text());
        } else {
          const url = URL.createObjectURL(res.data);
          revoke = url;
          setBlobUrl(url);
        }
      })
      .catch(() => setError(true));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [file.id, file.mimeType, canPreview]);

  async function download() {
    const res = await clientApi.get(`/app/files/${file.id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <FileText className="h-4 w-4 text-ink-faint" />
          <span className="font-medium">{file.originalName}</span>
          <span className="text-ink-faint">
            ({Math.round(file.size / 1024)} Ko)
          </span>
        </div>
        <button className="btn-secondary !py-1.5 !px-3" onClick={download}>
          <Download className="h-4 w-4" /> Télécharger
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface-subtle">
        {error ? (
          <div className="flex items-center gap-2 p-6 text-sm text-ink-muted">
            <FileWarning className="h-5 w-5" /> Aperçu indisponible.
          </div>
        ) : !canPreview ? (
          <div className="p-6 text-sm text-ink-muted">
            Aperçu non disponible pour ce type de fichier.
          </div>
        ) : file.mimeType === 'application/pdf' && blobUrl ? (
          <iframe
            src={blobUrl}
            title={file.originalName}
            className="h-[60vh] w-full"
          />
        ) : file.mimeType.startsWith('image/') && blobUrl ? (
          <img
            src={blobUrl}
            alt={file.originalName}
            className="mx-auto max-h-[60vh] object-contain"
          />
        ) : textContent != null ? (
          <pre className="max-h-[60vh] overflow-auto p-4 text-xs text-ink-soft scrollbar-slim">
            {textContent}
          </pre>
        ) : (
          <div className="p-6 text-sm text-ink-muted">Chargement de l’aperçu…</div>
        )}
      </div>
    </div>
  );
}
