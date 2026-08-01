import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Graph API version pinned to the one Meta's own "Get started" curl example
 * uses today (developers.facebook.com/documentation/business-messaging/whatsapp/get-started).
 * Meta ships a new major roughly twice a year and guarantees at least two years
 * of support per version, so this is safe to leave unpinned-to-"latest" and
 * bump deliberately.
 */
export const API_VERSION = "v23.0";
export const API_HOST = "https://graph.facebook.com";
export const BASE_URL = `${API_HOST}/${API_VERSION}`;

/**
 * The Cloud API's error envelope. A failure is always a non-2xx status with
 * this body — never a 200 with an in-body error flag (unlike Telegram).
 */
export interface WhatsAppApiError {
  error: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body. Every Cloud API call this app makes accepts `application/json`. */
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PATCH-shaped call doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Parse the template "Components" JSON param into the array the Cloud API
 * expects (`template.components`). Accepts either that array directly or a
 * JSON string of it — `type: "json"` params may arrive as either depending on
 * how the caller built the invocation.
 */
export function parseComponents(raw: unknown): unknown[] | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error("`components` must be a JSON array of Cloud API template component objects.");
  }
  return parsed.length ? parsed : undefined;
}

/**
 * The phone number's own identity — collected as a non-secret Auth field and
 * echoed onto the Connection's redacted `display` by `afterConnect`, exactly
 * like Zendesk's subdomain. An Action never sees the raw credential, so it
 * reads the phone number id from here rather than from `credential`.
 */
export function phoneNumberIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { phoneNumberId?: string };
  if (display.phoneNumberId) return display.phoneNumberId;
  throw new Error(
    "WhatsApp connection has no phoneNumberId — reconnect the account so it can be recorded.",
  );
}

/**
 * The WhatsApp Business Account id. Only needed by the template-management
 * actions (Meta scopes `message_templates` to the WABA, not the phone
 * number), so it is an optional Auth field — a connection that never touches
 * those actions can skip it.
 */
export function wabaIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { wabaId?: string };
  if (display.wabaId) return display.wabaId;
  throw new Error(
    "WhatsApp connection has no wabaId on record — reconnect the account with a WhatsApp " +
      "Business Account ID to use template-management actions.",
  );
}

export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string; message_status?: string }>;
}

export interface TemplatesListResponse {
  data: Array<{
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components: unknown[];
  }>;
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
}

export interface BusinessProfileResponse {
  data: Array<{
    messaging_product?: "whatsapp";
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    profile_picture_url?: string;
    websites?: string[];
    vertical?: string;
  }>;
}

const BUSINESS_PROFILE_FIELDS =
  "about,address,description,email,profile_picture_url,websites,vertical";

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class WhatsAppClient {
  private phoneNumberId: string;

  constructor(private ctx: HookContext) {
    this.phoneNumberId = phoneNumberIdFromConnection(ctx.connection);
  }

  /** `POST /{phone-number-id}/messages` — every send + the read-receipt call share this shape. */
  sendMessage(body: Record<string, unknown>): Promise<SendMessageResponse> {
    return this.request(`/${this.phoneNumberId}/messages`, {
      method: "POST",
      body: { messaging_product: "whatsapp", ...compact(body) },
    });
  }

  markRead(messageId: string): Promise<{ success: boolean }> {
    return this.request(`/${this.phoneNumberId}/messages`, {
      method: "POST",
      body: { messaging_product: "whatsapp", status: "read", message_id: messageId },
    });
  }

  listTemplates(
    query: { name?: string; limit?: number } = {},
  ): Promise<TemplatesListResponse> {
    const wabaId = wabaIdFromConnection(this.ctx.connection);
    return this.request(`/${wabaId}/message_templates`, {
      query: {
        fields: "name,status,category,language,components",
        name: query.name,
        limit: query.limit,
      },
    });
  }

  getBusinessProfile(): Promise<BusinessProfileResponse> {
    return this.request(`/${this.phoneNumberId}/whatsapp_business_profile`, {
      query: { fields: BUSINESS_PROFILE_FIELDS },
    });
  }

  updateBusinessProfile(body: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.request(`/${this.phoneNumberId}/whatsapp_business_profile`, {
      method: "POST",
      body: { messaging_product: "whatsapp", ...compact(body) },
    });
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      if (!res.ok) {
        throw new Error(
          `WhatsApp ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: non-JSON response`,
        );
      }
      throw new Error(`WhatsApp returned a non-JSON response for ${init.method} ${url.pathname}`);
    }
    if (!res.ok) {
      // Unlike Telegram, a Cloud API failure is a non-2xx status with this
      // envelope — never a 200 carrying an in-body error flag.
      const err = (body as WhatsAppApiError | undefined)?.error;
      throw new Error(
        `WhatsApp ${err?.code ?? res.status} for ${init.method} ${url.pathname}: ${
          err?.message ?? res.statusText
        }`,
      );
    }
    return body as T;
  }
}
