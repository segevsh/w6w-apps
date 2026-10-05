import { describeError, REST } from "./client.ts";

/**
 * The credential probe: `GET /services/rest/system/v1/serverTime`.
 *
 * Oracle's page for the operation says "There are no explicit permissions for this operation", so
 * a role that can reach REST web services at all can call it — a check on a record type would
 * report a working connection as broken for a role that lacks that record's permission. The
 * response is `{"serverTime": "<UTC ISO timestamp>"}`: no account or credential material, so
 * (unlike the whoami endpoints that echo a caller's own key) it is safe to run from a health
 * surface.
 */
export const PROBE_PATH = `${REST}/system/v1/serverTime`;

export interface ProbeResult {
  ok: boolean;
  message?: string;
}

/** Classify from the body — `serverTime` for success, NetSuite's own `o:errorCode` for failure. */
export async function classifyProbe(res: Response): Promise<ProbeResult> {
  const text = await res.text().catch(() => "");
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch { /* handled below */ }

  if (
    res.ok && typeof body === "object" && body !== null &&
    typeof (body as { serverTime?: unknown }).serverTime === "string"
  ) {
    return { ok: true };
  }
  const e = describeError(body);
  if (e.code) {
    return { ok: false, message: `${e.code}: ${e.message ?? `HTTP ${res.status}`}` };
  }
  if (res.ok) return { ok: false, message: "NetSuite answered without a serverTime field" };
  return { ok: false, message: e.message ?? `NetSuite returned HTTP ${res.status}` };
}
