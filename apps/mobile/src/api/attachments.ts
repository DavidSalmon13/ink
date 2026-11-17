import { ApiError, NetworkError, type ApiClient } from '@/api/client';

export type AttachmentKind = 'tattoo_photo' | 'sketch';
export type AttachmentMimeType = 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp';

/** What the app declares before uploading. Images only, up to 15 MB. */
export interface AttachmentMeta {
  kind: AttachmentKind;
  mimeType: AttachmentMimeType;
  sizeBytes: number;
  width?: number;
  height?: number;
}

export interface Attachment extends Required<Pick<AttachmentMeta, 'kind' | 'mimeType' | 'sizeBytes'>> {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  width: number | null;
  height: number | null;
  /** Presigned PUT URL for the bytes, valid 15 minutes. */
  uploadUrl: string;
}

/** Anything fetch accepts as a request body (a Blob from the image picker, bytes, …). */
export type UploadBody = NonNullable<RequestInit['body']>;

/**
 * Records the attachment (a device-generated UUID `id`) and returns it with a presigned upload URL.
 * Retrying with the same values is safe and never creates a duplicate.
 */
export function requestUpload(
  api: ApiClient,
  id: string,
  meta: AttachmentMeta & { version?: number },
): Promise<Attachment> {
  return api.apiFetch<Attachment>(`/attachments/${id}`, { method: 'PUT', body: meta });
}

/**
 * PUTs the bytes straight to the store. No Authorization header: the presigned URL is the credential.
 * The content type (and length) must match what `requestUpload` declared.
 */
export async function uploadBytes(uploadUrl: string, body: UploadBody, mimeType: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': mimeType }, body });
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new ApiError(res.status, undefined, 'Upload failed');
}

/** requestUpload, then uploadBytes to the URL it returns. */
export async function uploadAttachment(
  api: ApiClient,
  id: string,
  meta: AttachmentMeta,
  body: UploadBody,
): Promise<Attachment> {
  const attachment = await requestUpload(api, id, meta);
  await uploadBytes(attachment.uploadUrl, body, meta.mimeType);
  return attachment;
}

/** A presigned download URL, valid 15 minutes. Deleted or unknown ids throw ApiError `not_found`. */
export async function getDownloadUrl(api: ApiClient, id: string): Promise<string> {
  const { downloadUrl } = await api.apiFetch<{ downloadUrl: string }>(`/attachments/${id}/download-url`, {
    method: 'GET',
  });
  return downloadUrl;
}

/** Soft-deletes the attachment. Repeating it is fine. */
export async function deleteAttachment(api: ApiClient, id: string): Promise<void> {
  await api.apiFetch<void>(`/attachments/${id}`, { method: 'DELETE' });
}
