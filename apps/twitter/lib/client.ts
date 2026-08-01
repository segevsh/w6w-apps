import type { HookContext } from "@w6w/types";

/**
 * `api.x.com` is the current canonical API host per docs.x.com (checked
 * 2026-07-31) — `api.twitter.com` is the pre-rebrand host and is treated as
 * deprecated in current X documentation, which references `api.x.com`
 * exclusively. The authorize step happens in the user's browser against
 * `x.com`, not through `ctx.fetch`, so it needs no entry in `network.allow`
 * (OAuth endpoint hosts are allowed implicitly).
 */
export const API_URL = "https://api.x.com/2";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
  /** multipart/form-data body — used only by the chunked media-upload calls. */
  form?: FormData;
}

interface XApiError {
  title?: string;
  detail?: string;
  errors?: Array<{ message?: string }>;
}

/** Decode a bare base64 string or a `data:<mime>;base64,<payload>` URL. */
export function base64ToBytes(input: string): Uint8Array {
  const match = input.match(/^data:([^;]+);base64,(.*)$/s);
  const clean = match ? match[2] : input;
  return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
}

/** MIME type from a `data:` URL, if the input carried one. */
export function dataUrlMime(input: string): string | undefined {
  return input.match(/^data:([^;]+);base64,/)?.[1];
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class TwitterClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const init: RequestInit = { method: options.method ?? "GET" };
    if (options.form) {
      // `ctx.fetch` (a real fetch under the hood) sets the multipart boundary
      // itself from the FormData body — no content-type header here.
      init.body = options.form;
    } else if (options.body !== undefined) {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : undefined;

    if (!res.ok) {
      const body = parsed as XApiError | undefined;
      const detail = body?.detail ?? body?.errors?.map((e) =>
        e.message
      ).filter(Boolean).join("; ") ??
        text;
      throw new Error(
        `X API ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    return parsed as T;
  }
}

export interface MediaUploadResult {
  mediaId: string;
  processingState?: string;
}

/**
 * Single-chunk INIT -> APPEND -> FINALIZE against the v2 chunked media-upload
 * endpoint (docs.x.com/x-api/media/quickstart/media-upload-chunked). One chunk
 * is enough for the images/GIFs this action targets — a multi-segment APPEND
 * loop for large video is out of scope for this action (see README).
 *
 * FINALIZE may come back with `processing_info.state: "pending"` even for a
 * single-chunk image; when it does, this polls STATUS a bounded number of
 * times rather than looping indefinitely, to stay inside the hook's timeout.
 */
export async function uploadMedia(
  ctx: HookContext,
  bytes: Uint8Array,
  mimeType: string,
  mediaCategory: string,
): Promise<MediaUploadResult> {
  const client = new TwitterClient(ctx);

  const init = await client.request<{ data: { id: string } }>("/media/upload", {
    method: "POST",
    form: (() => {
      const f = new FormData();
      f.append("command", "INIT");
      f.append("media_type", mimeType);
      f.append("total_bytes", String(bytes.length));
      f.append("media_category", mediaCategory);
      return f;
    })(),
  });
  const mediaId = init.data.id;

  await client.request("/media/upload", {
    method: "POST",
    form: (() => {
      const f = new FormData();
      f.append("command", "APPEND");
      f.append("media_id", mediaId);
      f.append("segment_index", "0");
      f.append("media", new Blob([new Uint8Array(bytes).buffer], { type: mimeType }));
      return f;
    })(),
  });

  type FinalizeResponse = {
    data: { id: string; processing_info?: { state: string; check_after_secs?: number } };
  };

  let final = await client.request<FinalizeResponse>("/media/upload", {
    method: "POST",
    form: (() => {
      const f = new FormData();
      f.append("command", "FINALIZE");
      f.append("media_id", mediaId);
      return f;
    })(),
  });

  // Images usually finalize synchronously; when a vendor-side processing step
  // is reported, poll STATUS a few times rather than trusting FINALIZE alone.
  let attempts = 0;
  while (
    final.data.processing_info &&
    !["succeeded", "failed"].includes(final.data.processing_info.state) &&
    attempts < 5
  ) {
    const waitSecs = Math.min(final.data.processing_info.check_after_secs ?? 1, 3);
    await new Promise((resolve) => setTimeout(resolve, waitSecs * 1000));
    final = await client.request<FinalizeResponse>("/media/upload", {
      query: { command: "STATUS", media_id: mediaId },
    });
    attempts++;
  }

  if (final.data.processing_info?.state === "failed") {
    throw new Error(`X media processing failed for media_id ${mediaId}`);
  }

  return { mediaId: final.data.id, processingState: final.data.processing_info?.state };
}
