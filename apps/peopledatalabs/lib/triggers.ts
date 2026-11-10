import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * People Data Labs "person records updated" webhook (rfcs/trigger.md, webhook form, manual).
 *
 * PDL pushes webhooks only to enterprise API and Data License customers, and only after the PDL
 * team registers the endpoint (target URL, headers, filters): there is no registration API. So
 * `onSubscribe` makes no PDL call and hands back the `callbackUrl` the user gives their PDL team.
 *
 * Trust model: PDL does not sign deliveries. Its docs say the registered headers should "at a
 * minimum" carry "a shared key for secure authorization", e.g. `"Authorization": "Bearer ..."`.
 * That header is chosen by the customer, so this trigger takes the header's NAME and its exact
 * VALUE as params and compares the delivery's header to the value in constant time, BEFORE it reads
 * the body. An unset shared key is refused before any compare. A shared key is not a signature: it
 * proves the sender knows the key, not that the body is unmodified, and a captured delivery can be
 * replayed (there is no timestamp). TLS carries the protection of the body.
 *
 * Payload: a JSON array of PDL person ids, in batches of up to 1,000, roughly once a month after a
 * data release. One delivery becomes one event carrying the whole batch. PDL does not resend
 * automatically after a non-200 answer.
 *
 * Docs (verified 2026-11-10): https://docs.peopledatalabs.com/docs/webhooks
 */

export interface TriggerParams {
  sharedKey?: string;
  headerName?: string;
}

/** The run's `trigger.event`: one delivered batch of updated person ids. */
export interface PersonUpdatesEvent {
  pdlIds: string[];
  count: number;
}

const SHARED_KEY_PARAM: Param = {
  key: "sharedKey",
  label: "Shared Key (header value)",
  type: "secret",
  required: true,
  hint:
    "The exact header VALUE you gave your PDL team to send with every webhook, e.g. `Bearer <random string>`. A delivery whose header does not match is refused.",
};

const HEADER_NAME_PARAM: Param = {
  key: "headerName",
  label: "Header Name",
  type: "string",
  advanced: true,
  hint: "The header that carries the shared key. Defaults to Authorization.",
};

const OUTPUT: OutputField[] = [
  { key: "pdlIds", type: "array", label: "PDL Person IDs" },
  { key: "count", type: "number", label: "Count" },
];

const SAMPLE: PersonUpdatesEvent = {
  pdlIds: ["9adnit66-hdZ5lkBbq-AOQ_0000", "YraxDoP16jzyjfxtn-1XJQ_0000"],
  count: 2,
};

const DEFAULT_HEADER = "authorization";

/** A syntactically valid header name, or a refusal that does not echo the value. */
function headerNameOf(v: unknown): string {
  const name = typeof v === "string" && v.trim() !== "" ? v.trim() : DEFAULT_HEADER;
  if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(name)) {
    throw new Error("People Data Labs delivery refused: the configured header name is invalid.");
  }
  return name;
}

/**
 * Check the delivery's shared-key header, then parse the body. Throws (never echoing the key, the
 * header value or the body) unless the header matches and the body is an array of id strings.
 */
export function verifyDelivery(
  raw: { method: string; headers: Record<string, string>; rawBody?: unknown },
  params: TriggerParams | undefined,
): PersonUpdatesEvent {
  if (raw.method.toUpperCase() !== "POST") {
    throw new Error(`People Data Labs delivers webhooks with POST, not ${raw.method}.`);
  }
  const key = requireSecret(params?.sharedKey);
  const body = requireRawBody(raw);
  const got = header(raw, headerNameOf(params?.headerName));
  if (got === undefined) {
    throw new Error("People Data Labs delivery refused: the shared-key header is missing.");
  }
  if (!timingSafeEqual(got, key)) {
    throw new Error("People Data Labs delivery refused: the shared key does not match.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Not a People Data Labs webhook delivery: the body is not JSON.");
  }
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string" && id !== "")) {
    throw new Error("Not a People Data Labs webhook delivery: expected an array of PDL ids.");
  }
  return { pdlIds: parsed as string[], count: parsed.length };
}

export const personUpdates: TriggerDefinition<
  TriggerParams,
  PersonUpdatesEvent,
  { callbackUrl: string }
> = {
  key: "person-updates",
  title: "Person Records Updated",
  description:
    "Fires when People Data Labs pushes a batch of person records that were updated and match the filters your PDL team registered (enterprise only; about monthly). The run gets the PDL person ids of the batch and their count.",
  params: [SHARED_KEY_PARAM, HEADER_NAME_PARAM],
  output: OUTPUT,
  sample: SAMPLE,

  onSubscribe({ callbackUrl }) {
    return { callbackUrl };
  },

  onUnsubscribe() {},

  handleIngest({ raw, params }) {
    return [verifyDelivery(raw, params)];
  },
};
