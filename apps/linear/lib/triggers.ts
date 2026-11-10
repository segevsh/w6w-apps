import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { LinearClient } from "./client.ts";

/**
 * Linear webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a webhook with the `webhookCreate` mutation, pointed at the host's
 *     `callbackUrl`, with a per-subscription random `secret` (D5 (1)), after deleting any webhook
 *     already pointed there. The secret lives in subscription state.
 *   - `onUnsubscribe` deletes it with `webhookDelete`; one Linear no longer has counts as deleted.
 *   - `handleIngest` verifies `Linear-Signature` (hex HMAC-SHA256 of the raw body) BEFORE reading the
 *     body, then rejects a `webhookTimestamp` (milliseconds, a field of the signed body) more than a
 *     minute from now, as Linear recommends against replays.
 *
 * Registering and reading webhooks needs a workspace admin (or an OAuth app with the `admin` scope).
 *
 * Docs (verified 2026-11-09): https://linear.app/developers/webhooks ("Create webhook using API",
 * "Securing Webhooks") and Linear's GraphQL schema (`WebhookCreateInput.secret`).
 */

/** Linear's replay guidance: the timestamp must be within a minute of now. */
const TOLERANCE_SEC = 60;

export interface TriggerParams {
  /** Team id or key; blank watches every public team. */
  teamId?: string;
  /** Comma-separated actions to keep (`create,update,remove`); blank keeps every action. */
  actions?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  resourceType: string;
  /** The per-subscription signing secret (plaintext jsonb: D5 amended). */
  secret: string;
}

/** The run's `trigger.event`. */
export interface LinearEvent {
  resourceType: string;
  action: string | null;
  deliveryId: string | null;
  id: string | null;
  url: string | null;
  actor: string | null;
  createdAt: string | null;
  /** The entity after the change. */
  data: Record<string, unknown>;
  /** On an update, the previous values of the changed fields. */
  updatedFrom: Record<string, unknown> | null;
}

const TEAM_PARAM: Param = {
  key: "teamId",
  label: "Team",
  type: "string",
  hint: "A team id or key to watch. Leave blank for every public team.",
};

const ACTIONS_PARAM: Param = {
  key: "actions",
  label: "Only these actions",
  type: "string",
  hint: "Comma-separated actions to react to: `create`, `update`, `remove`. Blank for all.",
};

const BASE_OUTPUT: OutputField[] = [
  { key: "resourceType", type: "string", label: "Resource type" },
  { key: "action", type: "string", label: "Action" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "id", type: "string", label: "Record ID" },
  { key: "url", type: "string", label: "URL" },
  { key: "actor", type: "string", label: "Actor" },
  { key: "createdAt", type: "string", label: "Time of the change" },
  { key: "data", type: "object", label: "Record" },
  { key: "updatedFrom", type: "object", label: "Previous values (updates)" },
];

const CREATE = `
  mutation WebhookCreate($input: WebhookCreateInput!) {
    webhookCreate(input: $input) { success webhook { id enabled } }
  }
`;
const DELETE = `
  mutation WebhookDelete($id: String!) {
    webhookDelete(id: $id) { success }
  }
`;
const LIST = `
  query Webhooks { webhooks(first: 100) { nodes { id url } } }
`;

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** `LinearClient` throws plain Errors; Linear words a missing entity as "Entity not found". */
function isGone(err: unknown): boolean {
  return err instanceof Error && /not found|does not exist/i.test(err.message);
}

async function webhooksPointingAt(client: LinearClient, url: string): Promise<string[]> {
  const res = await client.query<{ webhooks?: { nodes?: Array<{ id?: unknown; url?: unknown }> } }>(
    LIST,
  );
  const found: string[] = [];
  for (const w of res.webhooks?.nodes ?? []) {
    const id = str(w.id);
    if (id && w.url === url) found.push(id);
  }
  return found;
}

async function deleteWebhook(client: LinearClient, id: string): Promise<void> {
  try {
    await client.query(DELETE, { id });
  } catch (err) {
    if (isGone(err)) return;
    throw err;
  }
}

/** Verify a delivery and return its parsed body; throws, echoing nothing, on any shortfall. */
async function verifiedBody(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number,
): Promise<Record<string, unknown>> {
  const rawBody = requireRawBody(raw);
  const key = requireSecret(secret);
  const given = header(raw, "linear-signature");
  const expected = await hmac("SHA-256", key, rawBody, "hex");
  if (given === undefined || !timingSafeEqual(given.toLowerCase(), expected)) {
    throw new Error("Linear delivery refused: the signature does not match.");
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new Error("Linear delivery refused: the body is not JSON.");
  }
  const obj = asObject(body);
  if (!obj) throw new Error("Linear delivery refused: the body is not a JSON object.");
  const ts = obj.webhookTimestamp;
  if (typeof ts !== "number" || !withinTolerance(ts / 1000, nowMs, TOLERANCE_SEC)) {
    throw new Error(
      "Linear delivery refused: the timestamp is missing or outside the 60-second window.",
    );
  }
  return obj;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Linear's webhook resource type (`Issue`, `Comment`, …). */
  resourceType: string;
  output: OutputField[];
  sampleData: Record<string, unknown>;
}

/** Build one Linear webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, LinearEvent, TriggerState> {
  const sample: LinearEvent = {
    resourceType: spec.resourceType,
    action: "create",
    deliveryId: "234d1a4e-b617-4388-90fe-adc3633d6b72",
    id: str(spec.sampleData.id),
    url: "https://linear.app/acme/issue/ENG-42/sample",
    actor: "Linear Orbit",
    createdAt: "2026-11-09T10:00:00.000Z",
    data: spec.sampleData,
    updatedFrom: null,
  };
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [TEAM_PARAM, ACTIONS_PARAM],
    output: [...BASE_OUTPUT, ...spec.output],
    sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const client = new LinearClient(ctx);
      for (const id of await webhooksPointingAt(client, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const secret = randomSecret();
      const teamId = params.teamId?.trim();
      const res = await client.query<
        { webhookCreate?: { success?: boolean; webhook?: { id?: unknown } } }
      >(CREATE, {
        input: {
          url: callbackUrl,
          label: "w6w trigger",
          resourceTypes: [spec.resourceType],
          secret,
          enabled: true,
          ...(teamId ? { teamId } : { allPublicTeams: true }),
        },
      });
      const webhookId = str(res.webhookCreate?.webhook?.id);
      if (!res.webhookCreate?.success || !webhookId) {
        throw new Error("Linear did not create the webhook.");
      }
      return { webhookId, resourceType: spec.resourceType, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (id) await deleteWebhook(new LinearClient(ctx), id);
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Linear delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifiedBody(raw, state?.secret, Date.now());
      if (str(body.type) !== spec.resourceType) return [];
      const action = str(body.action);
      const wanted = (params?.actions ?? "").split(",").map((a) => a.trim()).filter(Boolean);
      if (wanted.length > 0 && (action === null || !wanted.includes(action))) return [];
      const data = asObject(body.data) ?? {};
      return [{
        resourceType: spec.resourceType,
        action,
        deliveryId: header(raw, "linear-delivery") ?? null,
        id: str(data.id),
        url: str(body.url),
        actor: str(asObject(body.actor)?.name),
        createdAt: str(body.createdAt),
        data,
        updatedFrom: asObject(body.updatedFrom),
      }];
    },
  };
}
