import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { GitHubClient, repoPath } from "./client.ts";

/**
 * GitHub repository-webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` registers a repository webhook pointed at the host's `callbackUrl` with a
 *     per-subscription random secret (D5 (1)), after deleting any webhook already pointed there (a
 *     leftover of an attempt that never recorded its id). The secret lives in subscription state.
 *   - `onUnsubscribe` deletes that webhook; one GitHub no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Hub-Signature-256` (`sha256=` + hex HMAC-SHA256 of the raw body)
 *     BEFORE parsing anything, answers GitHub's `ping` with no event, and ignores any event type
 *     the trigger did not ask for. A delivery with no secret on record or no signature is refused.
 *
 * Docs (verified 2026-11-09): https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 * and https://docs.github.com/en/rest/repos/webhooks
 */

export interface TriggerParams {
  owner?: string;
  repository?: string;
  /** Comma-separated `payload.action` values to keep (`opened,closed`); blank keeps every action. */
  actions?: string;
  /** Any-event trigger only: comma-separated GitHub event names; blank subscribes to every event. */
  events?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  hookId: string;
  owner: string;
  repository: string;
  event: string;
  /** Any-event trigger only: the event names the hook was registered for (`*` = every event). */
  events?: string[];
  /** The per-subscription signing secret (plaintext jsonb: D5 amended). */
  secret: string;
}

/** The run's `trigger.event`. */
export interface GitHubEvent {
  event: string;
  action: string | null;
  deliveryId: string | null;
  repository: string | null;
  sender: string | null;
  /** GitHub's webhook payload, verbatim. */
  payload: Record<string, unknown>;
}

const OWNER_PARAM: Param = {
  key: "owner",
  label: "Owner",
  type: "string",
  required: true,
  hint: "The user or organization that owns the repository.",
};

const REPOSITORY_PARAM: Param = {
  key: "repository",
  label: "Repository",
  type: "string",
  required: true,
  hint: "The repository name (not the full owner/name).",
};

const ACTIONS_PARAM: Param = {
  key: "actions",
  label: "Only these actions",
  type: "string",
  hint:
    "Comma-separated payload actions to react to, e.g. `opened,closed`. Blank for every action.",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  placeholder: "check_run, deployment, label",
  hint:
    "Comma-separated GitHub webhook event names (the X-GitHub-Event value, e.g. `check_run`), or blank for every event. Full list: https://docs.github.com/en/webhooks/webhook-events-and-payloads",
};

const BASE_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "action", type: "string", label: "Action" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "repository", type: "string", label: "Repository" },
  { key: "sender", type: "string", label: "Sender" },
  { key: "payload", type: "object", label: "Payload" },
];

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** The any-event trigger's `events` param → event names; blank is every event (`*`). */
export function parseEventNames(raw: unknown): string[] {
  const names = typeof raw === "string"
    ? [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => s !== ""))]
    : [];
  for (const n of names) {
    if (n !== "*" && !/^[a-z][a-z_]{0,63}$/.test(n)) {
      throw new Error(`"${n.slice(0, 40)}" is not a GitHub webhook event name (e.g. check_run).`);
    }
  }
  return names.length === 0 || names.includes("*") ? ["*"] : names;
}

function required(v: string | undefined, label: string): string {
  const s = v?.trim();
  if (!s) throw new Error(`${label} is required to register a GitHub webhook.`);
  return s;
}

/** True for the "no such webhook" answers `GitHubClient` raises (it throws plain Errors). */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^GitHub (404|410)\b/.test(err.message);
}

/** Ids of the repository's webhooks that already deliver to `url` (first 100 webhooks). */
async function hooksPointingAt(
  client: GitHubClient,
  owner: string,
  repository: string,
  url: string,
): Promise<string[]> {
  const hooks = await client.request<Array<{ id?: unknown; config?: { url?: unknown } }>>(
    `/repos/${repoPath(owner, repository)}/hooks`,
    { query: { per_page: 100 } },
  );
  const found: string[] = [];
  for (const h of Array.isArray(hooks) ? hooks : []) {
    const id = str(h.id);
    if (id && h.config?.url === url) found.push(id);
  }
  return found;
}

async function deleteHook(
  client: GitHubClient,
  owner: string,
  repository: string,
  hookId: string,
): Promise<void> {
  try {
    await client.request(
      `/repos/${repoPath(owner, repository)}/hooks/${encodeURIComponent(hookId)}`,
      {
        method: "DELETE",
      },
    );
  } catch (err) {
    if (isGone(err)) return;
    throw err;
  }
}

/**
 * Verify a delivery and return its parsed payload. Throws, naming no secret, signature or header
 * value, on anything short of a valid `X-Hub-Signature-256`.
 */
async function verifiedPayload(
  raw: Parameters<typeof requireRawBody>[0] & { headers: Record<string, string> },
  secret: unknown,
): Promise<Record<string, unknown>> {
  const rawBody = requireRawBody(raw);
  const key = requireSecret(secret);
  const given = header(raw, "x-hub-signature-256");
  const expected = `sha256=${await hmac("SHA-256", key, rawBody, "hex")}`;
  if (given === undefined || !timingSafeEqual(given, expected)) {
    throw new Error("GitHub delivery refused: the signature does not match.");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Error(
      "GitHub delivery refused: the body is not JSON (set the content type to JSON).",
    );
  }
  const obj = asObject(payload);
  if (!obj) throw new Error("GitHub delivery refused: the body is not a JSON object.");
  return obj;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /**
   * The GitHub webhook event name (`X-GitHub-Event`) this trigger fires on. Omit it for the
   * any-event trigger, whose events come from its `events` param (see `sampleEvent`).
   */
  event?: string;
  /** The event name the any-event trigger's sample shows (required when `event` is omitted). */
  sampleEvent?: string;
  /** Extra `output` fields beyond the shared envelope. */
  output: OutputField[];
  /** Representative `payload` for the sample. */
  samplePayload: Record<string, unknown>;
  /** Whether the event carries `payload.action` (so the `actions` filter applies). */
  hasActions: boolean;
}

/** Build one GitHub webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, GitHubEvent, TriggerState> {
  const fixed = spec.event;
  const sample: GitHubEvent = {
    event: fixed ?? spec.sampleEvent ?? "push",
    action: spec.hasActions || fixed === undefined ? str(spec.samplePayload.action) : null,
    deliveryId: "72d3162e-cc78-11e3-81ab-4c9367dc0958",
    repository: "octocat/Hello-World",
    sender: "octocat",
    payload: spec.samplePayload,
  };
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed === undefined
      ? [OWNER_PARAM, REPOSITORY_PARAM, EVENTS_PARAM]
      : spec.hasActions
      ? [OWNER_PARAM, REPOSITORY_PARAM, ACTIONS_PARAM]
      : [OWNER_PARAM, REPOSITORY_PARAM],
    output: [...BASE_OUTPUT, ...spec.output],
    sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const owner = required(params.owner, "Owner");
      const repository = required(params.repository, "Repository");
      const events = fixed === undefined ? parseEventNames(params.events) : [fixed];
      const client = new GitHubClient(ctx);
      for (const id of await hooksPointingAt(client, owner, repository, callbackUrl)) {
        await deleteHook(client, owner, repository, id);
      }
      const secret = randomSecret();
      const created = await client.request<{ id?: unknown }>(
        `/repos/${repoPath(owner, repository)}/hooks`,
        {
          method: "POST",
          body: {
            name: "web",
            active: true,
            events,
            config: { url: callbackUrl, content_type: "json", secret, insecure_ssl: "0" },
          },
        },
      );
      const hookId = str(created?.id);
      if (!hookId) throw new Error("GitHub created the webhook but returned no id.");
      return fixed === undefined
        ? { hookId, owner, repository, event: events.join(","), events, secret }
        : { hookId, owner, repository, event: fixed, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      const hookId = str(s?.hookId);
      if (hookId && s?.owner && s?.repository) {
        await deleteHook(new GitHubClient(ctx), s.owner, s.repository, hookId);
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`GitHub delivers webhooks with POST, not ${raw.method}.`);
      }
      const payload = await verifiedPayload(raw, state?.secret);
      const event = header(raw, "x-github-event");
      if (event === undefined || event === "ping") return [];
      if (fixed === undefined) {
        const wanted = state?.events ?? [];
        if (!wanted.includes("*") && !wanted.includes(event)) return [];
      } else if (event !== fixed) return [];
      const action = str(payload.action);
      if (spec.hasActions) {
        const wanted = (params?.actions ?? "").split(",").map((a) => a.trim()).filter(Boolean);
        if (wanted.length > 0 && (action === null || !wanted.includes(action))) return [];
      }
      return [{
        event,
        action,
        deliveryId: header(raw, "x-github-delivery") ?? null,
        repository: str(asObject(payload.repository)?.full_name),
        sender: str(asObject(payload.sender)?.login),
        payload,
      }];
    },
  };
}
