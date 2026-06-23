import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { clientApi } from '@/lib/api';

// Loads a contact's protected photo (auth header required) as a blob.
export function ContactPhoto({
  photoFileId,
  name,
  size = 'md',
}: {
  photoFileId?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFileId) {
      setUrl(null);
      return;
    }
    let revoke: string | null = null;
    clientApi
      .get(`/app/files/${photoFileId}/preview`, { responseType: 'blob' })
      .then((r) => {
        const u = URL.createObjectURL(r.data);
        revoke = u;
        setUrl(u);
      })
      .catch(() => setUrl(null));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [photoFileId]);

  return <Avatar name={name} src={url} size={size} />;
}
