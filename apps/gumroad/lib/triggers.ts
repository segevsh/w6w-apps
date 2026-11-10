import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { GumroadClient, seg } from "./client.ts";

/**
 * Event and snapshot triggers for Gumroad.
 *
 * Sources (gumroad.com/api, a client-rendered page read from its own JavaScript bundle on
 * 2026-11-10): "Resource subscriptions" lists the 8 resource names; each GET/PUT list below
 * ("Retrieve all of the existing ...") returns the whole collection with no paging parameters.
 */

export const productIdParam: Param = {
  key: "productId",
  label: "Product ID",
  type: "string",
  required: true,
  hint:
    "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
};

export const variantCategoryIdParam: Param = {
  key: "variantCategoryId",
  label: "Variant category ID",
  type: "string",
  required: true,
  hint: "From List Variant Categories.",
};

/** The 8 documented resource names, in the vendor's order. */
export const RESOURCES = [
  "sale",
  "refund",
  "dispute",
  "dispute_won",
  "cancellation",
  "subscription_updated",
  "subscription_ended",
  "subscription_restarted",
] as const;
export type Resource = (typeof RESOURCES)[number];

/**
 * Own marker on the registered `post_url`, so one callback URL can tell which resource a delivery
 * belongs to. Gumroad's subscription payloads for the subscription_* resources carry no
 * `resource_name` field in the reference, so this is the only reliable tag for Any Event.
 */
export const RESOURCE_QUERY = "w6w_resource";

interface WebhooksState {
  webhookIds: string[];
}

function postUrl(callbackUrl: string, resource: Resource, tagged: boolean): string {
  if (!tagged) return callbackUrl;
  const url = new URL(callbackUrl);
  url.searchParams.set(RESOURCE_QUERY, resource);
  return url.toString();
}

async function remove(client: GumroadClient, id: string): Promise<void> {
  try {
    await client.call("DELETE", `/resource_subscriptions/${seg(id)}`);
  } catch (error) {
    if (/\b(404|410)\b/.test(String(error))) return;
    throw error;
  }
}

/** Replace any leftover registration of this URL for `resource`, then register it. Returns the id. */
async function register(
  client: GumroadClient,
  resource: Resource,
  url: string,
): Promise<string> {
  const listed = await client.call("GET", "/resource_subscriptions", {
    query: { resource_name: resource },
  });
  for (
    const item of (listed.resource_subscriptions as Array<Record<string, unknown>> | undefined) ??
      []
  ) {
    if (item.post_url === url && item.id != null) await remove(client, String(item.id));
  }
  const created = await client.call("PUT", "/resource_subscriptions", {
    form: { resource_name: resource, post_url: url },
  });
  const id = String(
    (created.resource_subscription as Record<string, unknown> | undefined)?.id ?? "",
  );
  if (!id) throw new Error("Gumroad created the resource subscription but returned no id.");
  return id;
}

async function registerAll(
  ctx: HookContext,
  resources: readonly Resource[],
  callbackUrl: string,
  tagged: boolean,
): Promise<WebhooksState> {
  const client = new GumroadClient(ctx);
  const webhookIds: string[] = [];
  try {
    for (const resource of resources) {
      webhookIds.push(await register(client, resource, postUrl(callbackUrl, resource, tagged)));
    }
  } catch (error) {
    // Never leave half a set registered: the host stores no state for a failed subscribe.
    for (const id of webhookIds) await remove(client, id).catch(() => undefined);
    throw error;
  }
  return { webhookIds };
}

async function unregister(state: unknown, ctx: HookContext): Promise<void> {
  const ids = (state as Partial<WebhooksState> | undefined)?.webhookIds;
  if (!Array.isArray(ids) || ids.length === 0) return;
  const client = new GumroadClient(ctx);
  for (const id of ids) await remove(client, String(id));
}

function contentType(headers: Record<string, string>): string {
  return Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === "content-type")?.[1] ??
    "";
}

/** The delivered payload as a flat object: Gumroad POSTs `application/x-www-form-urlencoded`. */
function payloads(raw: {
  method: string;
  query?: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
}, idKeys: readonly string[]): Record<string, unknown>[] {
  if (String(raw.method).toUpperCase() !== "POST") {
    throw new Error("Gumroad delivers webhooks with POST.");
  }
  const body = typeof raw.body === "string" &&
      contentType(raw.headers).includes("application/x-www-form-urlencoded")
    ? Object.fromEntries(new URLSearchParams(raw.body))
    : raw.body;
  const tag = raw.query?.[RESOURCE_QUERY];
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const item of Array.isArray(body) ? body : [body]) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const id = idKeys.map((key) => record[key]).find((v) => v !== undefined && v !== "");
    if (id === undefined || seen.has(String(id))) continue;
    seen.add(String(id));
    out.push(
      tag && record.resource_name === undefined ? { ...record, resource_name: tag } : record,
    );
  }
  return out;
}

const SALE_ID = ["sale_id", "id", "order_number"] as const;
const SUBSCRIPTION_ID = ["subscription_id", "id"] as const;

const saleOutput: OutputField[] = [
  { key: "sale_id", type: "string", label: "Sale ID" },
  { key: "product_id", type: "string", label: "Product ID" },
  { key: "product_name", type: "string", label: "Product name" },
  { key: "email", type: "string", label: "Buyer email" },
  { key: "price", type: "string", label: "Price (cents)" },
  { key: "resource_name", type: "string", label: "Resource" },
];

const subscriptionOutput: OutputField[] = [
  { key: "subscription_id", type: "string", label: "Subscription ID" },
  { key: "product_id", type: "string", label: "Product ID" },
  { key: "product_name", type: "string", label: "Product name" },
  { key: "user_email", type: "string", label: "Subscriber email" },
  { key: "created_at", type: "string", label: "Subscription created at" },
];

/** One named trigger per resource, registering exactly that resource. */
export function resourceTrigger(spec: {
  key: string;
  title: string;
  resource: Resource;
  description: string;
  subscription: boolean;
  extra?: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition<Record<string, never>, Record<string, unknown>, WebhooksState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: [...(spec.subscription ? subscriptionOutput : saleOutput), ...(spec.extra ?? [])],
    sample: spec.sample,
    onSubscribe: ({ callbackUrl }, ctx) => registerAll(ctx, [spec.resource], callbackUrl, false),
    onUnsubscribe: ({ state }, ctx) => unregister(state, ctx),
    handleIngest: ({ raw }) => payloads(raw, spec.subscription ? SUBSCRIPTION_ID : SALE_ID),
  };
}

/** Comma-separated resource names; unknown names fail loudly, empty means all eight. */
export function parseResources(raw: unknown): Resource[] {
  if (raw === undefined || raw === null || raw === "") return [...RESOURCES];
  const names = (Array.isArray(raw) ? raw : String(raw).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  const unknown = names.filter((name) => !(RESOURCES as readonly string[]).includes(name));
  if (unknown.length) {
    throw new Error(
      `Unknown Gumroad event(s): ${unknown.join(", ")}. Use ${RESOURCES.join(", ")}.`,
    );
  }
  return names.length ? [...new Set(names)] as Resource[] : [...RESOURCES];
}

export const anyEvent: TriggerDefinition<
  { events?: string },
  Record<string, unknown>,
  WebhooksState
> = {
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Gumroad resource event (sale, refund, dispute, dispute won, cancellation, subscription updated, ended or restarted), or only the listed ones. The run gets the delivered fields and the resource name.",
  params: [{
    key: "events",
    label: "Events",
    type: "string",
    hint:
      "Comma-separated Gumroad resource names, e.g. sale,refund,subscription_ended. Leave empty for all eight.",
  }],
  output: [
    { key: "resource_name", type: "string", label: "Resource" },
    { key: "sale_id", type: "string", label: "Sale ID (sale, refund, dispute events)" },
    { key: "subscription_id", type: "string", label: "Subscription ID (subscription events)" },
    { key: "product_id", type: "string", label: "Product ID" },
    { key: "product_name", type: "string", label: "Product name" },
  ],
  sample: {
    resource_name: "subscription_ended",
    subscription_id: "sub_1",
    product_id: "prod_1",
    product_name: "Pencil Icon PSD",
    ended_reason: "cancelled",
  },
  async onSubscribe({ params, callbackUrl }, ctx) {
    return await registerAll(ctx, parseResources(params?.events), callbackUrl, true);
  },
  onUnsubscribe: ({ state }, ctx) => unregister(state, ctx),
  handleIngest({ raw, params }) {
    const wanted = parseResources(params?.events);
    return payloads(raw, ["sale_id", "subscription_id", "id", "order_number"]).filter((p) =>
      p.resource_name === undefined || wanted.includes(String(p.resource_name) as Resource)
    );
  },
};

/**
 * "New <record>" for a bounded collection that the vendor returns whole in one request (no paging
 * parameters, no order) — `pollSnapshot` on the action's rows, `added` only. Rows without an id are
 * dropped: a duplicate or empty key would make the kit throw on every check.
 */
export function newRecordSnapshot<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  params?: Param[];
  input(params: P): Record<string, unknown>;
  rows(result: unknown): unknown[];
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const result = await spec.action.execute(spec.input(params), ctx);
      const rows = spec.rows(result)
        .filter((row) => String((row as { id?: unknown })?.id ?? "") !== "")
        .map((row) => ({ key: String((row as { id: unknown }).id), values: row }));
      const polled = await pollSnapshot({ state, rows, emit: { added: true }, maxRows: 5000 });
      return {
        events: polled.events.map((e) => e.values as Record<string, unknown>),
        nextState: polled.nextState,
      };
    },
  };
}
