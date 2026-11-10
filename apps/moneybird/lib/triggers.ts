import type { HookContext, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { pollWindow } from "./window.ts";
import salesInvoiceList from "../actions/sales-invoice-list.ts";
import { MoneybirdClient, resolveAdministrationId } from "./client.ts";

const OVERLAP_MS = 10 * 60 * 1000;
const PAGE_SIZE = 100;
/** Pages one check reads; a bigger window resumes next check. */
const MAX_PAGES = 5;
const SEEN_WINDOW = 1000;

export const clock = { now: (): number => Date.now() };

interface SalesInvoice {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/** `created_after` / `updated_after` take an ISO 8601 UTC time and are exclusive. */
export function afterFilter(field: "created_after" | "updated_after", sinceMs: number): string {
  const iso = new Date(sinceMs).toISOString().replace(/\.\d{3}Z$/, "Z");
  return `${field}:${iso}`;
}

/**
 * `created_after` / `updated_after` have no upper bound, so a window that holds more than one read
 * resumes by page number (brief 9.8). An arrival while it drains can only push records to a LATER
 * page (a re-read, deduped by the seen ids), never skip one.
 */
function check(
  field: "created_after" | "updated_after",
  idOf: (invoice: SalesInvoice) => string,
  state: unknown,
  ctx: HookContext,
) {
  const stampKey = field === "created_after" ? "created_at" : "updated_at";
  return pollWindow<SalesInvoice, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf,
    tsOf: (invoice) => {
      const ms = Date.parse(String(invoice[stampKey] ?? ""));
      return Number.isNaN(ms) ? undefined : ms;
    },
    async load(since, page) {
      const result = await salesInvoiceList.execute(
        { filter: afterFilter(field, since), page: page ?? 1, perPage: PAGE_SIZE },
        ctx,
      ) as { items?: SalesInvoice[] };
      const items = result.items ?? [];
      return { items, next: items.length >= PAGE_SIZE ? (page ?? 1) + 1 : undefined };
    },
  });
}

export function checkNewSalesInvoice(state: unknown, ctx: HookContext) {
  return check("created_after", (invoice) => String(invoice.id), state, ctx);
}

export function checkNewOrUpdatedSalesInvoice(state: unknown, ctx: HookContext) {
  return check(
    "updated_after",
    (invoice) => `${invoice.id}:${invoice.updated_at ?? ""}`,
    state,
    ctx,
  );
}

const output: TriggerDefinition["output"] = [
  { key: "id", type: "string", label: "Sales invoice ID" },
  { key: "invoice_id", type: "string", label: "Invoice number" },
  { key: "state", type: "string", label: "State" },
  { key: "contact_id", type: "string", label: "Contact ID" },
  { key: "total_price_incl_tax", type: "string", label: "Total incl. tax" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

const sample = {
  id: "403101852297429005",
  invoice_id: "2026-0001",
  state: "open",
  contact_id: "403101852183307262",
  total_price_incl_tax: "121.0",
  created_at: "2026-11-10T10:00:00.000Z",
  updated_at: "2026-11-10T10:00:00.000Z",
};

export const newSalesInvoiceTrigger: TriggerDefinition = {
  key: "new-sales-invoice",
  title: "New Sales Invoice",
  description: "The run gets each newly created Moneybird sales invoice.",
  output,
  sample,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewSalesInvoice(state, ctx);
  },
};

export const newOrUpdatedSalesInvoiceTrigger: TriggerDefinition = {
  key: "new-or-updated-sales-invoice",
  title: "New or Updated Sales Invoice",
  description: "The run gets each sales invoice that is newly created or edited.",
  output,
  sample,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewOrUpdatedSalesInvoice(state, ctx);
  },
};

/**
 * Moneybird contact webhook (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers `POST /{administration}/webhooks` for the `contact_created` event
 *     only. Moneybird returns the webhook's signing `secret` in that one response; it is kept in
 *     subscription state (D5 (2): the vendor chooses it) and a webhook without one is rolled back.
 *   - `onUnsubscribe` deletes the webhook; a 404/410 means it is already gone.
 *   - `handleIngest` verifies `Moneybird-Signature: t=<unix seconds>,v1=<hex>[,v1=<hex>]` first:
 *     `v1` is the hex HMAC-SHA256 of `"<t>.<raw body>"` under the secret (several `v1` values during
 *     a secret rotation, any one may match), and `t` must be within five minutes of now.
 *
 * Docs (verified 2026-11-10): https://developer.moneybird.com/webhooks/getting-started,
 * https://developer.moneybird.com/webhooks/verifying-signatures,
 * https://developer.moneybird.com/webhooks/payload and https://developer.moneybird.com/api/webhooks
 */

export interface ContactWebhookState {
  administrationId: string;
  webhookId: string;
  secret: string;
}

export interface ContactEvent {
  action: string;
  administrationId: string | null;
  webhookId: string | null;
  contactId: string | null;
  companyName: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  customerId: string | null;
  createdAt: string | null;
  contact: Record<string, unknown>;
}

const contactOutput: TriggerDefinition["output"] = [
  { key: "action", type: "string", label: "Event" },
  { key: "administrationId", type: "string", label: "Administration ID" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "contactId", type: "string", label: "Contact ID" },
  { key: "companyName", type: "string", label: "Company name" },
  { key: "firstname", type: "string", label: "First name" },
  { key: "lastname", type: "string", label: "Last name" },
  { key: "email", type: "string", label: "Email" },
  { key: "phone", type: "string", label: "Phone" },
  { key: "customerId", type: "string", label: "Customer ID" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "contact", type: "object", label: "Contact (as the API returns it)" },
];

const contactSample: ContactEvent = {
  action: "contact_created",
  administrationId: "116015326147118082",
  webhookId: "116010948233266179",
  contactId: "116015245567198212",
  companyName: "Foobar Holding B.V.",
  firstname: "",
  lastname: "",
  email: "info@example.com",
  phone: "",
  customerId: "1",
  createdAt: "2026-11-10T10:39:41.615Z",
  contact: {
    id: "116015245567198212",
    company_name: "Foobar Holding B.V.",
    email: "info@example.com",
    customer_id: "1",
    created_at: "2026-11-10T10:39:41.615Z",
  },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → its event. Throws on a body that is not a Moneybird webhook push. */
export function normalizeContactDelivery(body: unknown): ContactEvent {
  const d = asObject(body);
  const action = str(d?.action);
  if (!d || !action) throw new Error("Not a Moneybird webhook delivery: expected `action`.");
  const c = asObject(d.entity) ?? {};
  return {
    action,
    administrationId: str(d.administration_id),
    webhookId: str(d.webhook_id),
    contactId: str(c.id) ?? str(d.entity_id),
    companyName: str(c.company_name),
    firstname: str(c.firstname),
    lastname: str(c.lastname),
    email: str(c.email),
    phone: str(c.phone),
    customerId: str(c.customer_id),
    createdAt: str(c.created_at),
    contact: c,
  };
}

/**
 * Check `Moneybird-Signature` against the exact bytes received. Throws (never echoing the secret,
 * the digest or the header) unless a `v1` digest matches and `t` is fresh; an unset secret is
 * refused before any compare. Returns the body.
 */
export async function verifyMoneybirdSignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "moneybird-signature");
  if (given === undefined || given === "") {
    throw new Error("Moneybird delivery refused: the Moneybird-Signature header is missing.");
  }
  let t = "";
  const digests: string[] = [];
  for (const part of given.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1" && v !== "") digests.push(v);
  }
  if (!/^\d{1,12}$/.test(t) || digests.length === 0) {
    throw new Error("Moneybird delivery refused: the Moneybird-Signature header is malformed.");
  }
  const expected = await hmac("SHA-256", key, `${t}.${body}`, "hex");
  let ok = false;
  for (const d of digests) if (timingSafeEqual(expected, d.toLowerCase())) ok = true;
  if (!ok) throw new Error("Moneybird delivery refused: the signature does not match.");
  if (!withinTolerance(Number(t), nowMs, 300)) {
    throw new Error("Moneybird delivery refused: the signature timestamp is outside five minutes.");
  }
  return body;
}

const isGone = (err: unknown) => err instanceof Error && /^Moneybird (404|410)\b/.test(err.message);

export const newContactTrigger: TriggerDefinition<
  Record<string, never>,
  ContactEvent,
  ContactWebhookState
> = {
  key: "new-contact",
  title: "New Contact",
  description:
    "Fires when a contact is created in Moneybird. The run gets the contact id, name, email, phone and customer id.",
  params: [],
  output: contactOutput,
  sample: contactSample,

  async onSubscribe({ callbackUrl }, ctx: HookContext) {
    const administrationId = resolveAdministrationId(ctx);
    const client = new MoneybirdClient(ctx, administrationId);
    const created = await client.request<{ id?: string | number; secret?: string }>("/webhooks", {
      method: "POST",
      body: { url: callbackUrl, enabled_events: ["contact_created"] },
    });
    const webhookId = created?.id !== undefined ? String(created.id) : "";
    if (!webhookId) throw new Error("Moneybird did not return a webhook id.");
    if (typeof created.secret !== "string" || created.secret === "") {
      try {
        await client.request(`/webhooks/${webhookId}`, { method: "DELETE" });
      } catch {
        // best effort: the subscription fails either way
      }
      throw new Error(
        "Moneybird did not return a signing secret for the webhook; refusing to accept unsigned deliveries.",
      );
    }
    return { administrationId, webhookId, secret: created.secret };
  },

  async onUnsubscribe({ state }, ctx: HookContext) {
    const s = state as Partial<ContactWebhookState> | undefined;
    if (!s?.administrationId || !s.webhookId) return;
    try {
      await new MoneybirdClient(ctx, s.administrationId).request(`/webhooks/${s.webhookId}`, {
        method: "DELETE",
      });
    } catch (err) {
      if (!isGone(err)) throw err;
    }
  },

  async handleIngest({ raw, state }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error(`Moneybird delivers webhooks with POST, not ${raw.method}.`);
    }
    const body = await verifyMoneybirdSignature(raw, state?.secret);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("Moneybird delivery refused: the body is not JSON.");
    }
    const event = normalizeContactDelivery(parsed);
    if (event.action !== "contact_created") return [];
    return [event];
  },
};
