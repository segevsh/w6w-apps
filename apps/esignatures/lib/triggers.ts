import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * eSignatures.com webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 *   - eSignatures.com has no webhook-management API: one URL is set in the account's API settings
 *     (or per contract with `custom_webhook_url`). `onSubscribe` therefore makes no vendor call: it
 *     hands back the `callbackUrl` the user pastes there, and `onUnsubscribe` is a no-op.
 *   - Every delivery carries `X-Signature-SHA256`: "an HMAC-SHA256 signature of the request body,
 *     generated using your secret token" (D5 (2): the account's Secret Token, pasted by the user).
 *     The vendor's reference does not say how the digest is encoded, so the lower-case hex form and
 *     the base64 form of the SAME HMAC are both accepted; either one needs the secret to produce.
 *     The scheme has no timestamp, so there is no replay window (the README says so).
 *
 * Docs (verified 2026-11-10): https://esignatures.com/docs/api (Webhooks section).
 */

export interface TriggerParams {
  signingSecret?: string;
}

/** The run's `trigger.event`: one contract or signer notification. */
export interface ContractEvent {
  status: string;
  contractId: string | null;
  title: string | null;
  metadata: string | null;
  source: string | null;
  test: string | null;
  pdfUrl: string | null;
  signer: Record<string, unknown> | null;
  signers: unknown[];
  reasonForDecline: string | null;
  data: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Secret Token",
  type: "secret",
  required: true,
  hint:
    "The Secret Token on the API page of your eSignatures.com account (the same token the connection uses). eSignatures.com signs every webhook with it; a delivery that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "status", type: "string", label: "Notification Status" },
  { key: "contractId", type: "string", label: "Contract ID" },
  { key: "title", type: "string", label: "Contract Title" },
  { key: "metadata", type: "string", label: "Contract Metadata" },
  { key: "source", type: "string", label: "Contract Source (api, ui, zapier)" },
  { key: "test", type: "string", label: "Test Contract (yes/no)" },
  { key: "pdfUrl", type: "string", label: "Signed PDF URL (contract-signed only)" },
  { key: "signer", type: "object", label: "Signer (signer events)" },
  { key: "signers", type: "array", label: "Signers (contract-signed, withdrawn)" },
  { key: "reasonForDecline", type: "string", label: "Reason for Decline" },
  { key: "data", type: "object", label: "Raw Notification Data" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** The delivery body → its event. Throws on a body that is not an eSignatures.com notification. */
export function normalizeDelivery(body: unknown): ContractEvent {
  const n = asObject(body);
  const status = str(n?.status);
  if (!n || !status) throw new Error("Not an eSignatures.com webhook delivery: expected `status`.");
  const data = asObject(n.data) ?? {};
  const contract = asObject(data.contract);
  return {
    status,
    contractId: str(contract?.id) ?? str(data.contract_id),
    title: str(contract?.title),
    metadata: str(contract?.metadata) ?? str(data.metadata),
    source: str(contract?.source),
    test: str(contract?.test),
    pdfUrl: str(contract?.contract_pdf_url),
    signer: asObject(data.signer),
    signers: Array.isArray(contract?.signers) ? contract.signers : [],
    reasonForDecline: str(data.reason_for_decline),
    data,
  };
}

/**
 * Check `X-Signature-SHA256` against the exact bytes received. Throws (never echoing the secret,
 * the signature or the header) unless it matches; an unset secret is refused before any compare.
 * Returns the verified body text.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-signature-sha256");
  if (given === undefined || given === "") {
    throw new Error("eSignatures.com delivery refused: the X-Signature-SHA256 header is missing.");
  }
  const hex = await hmac("SHA-256", key, body, "hex");
  const b64 = await hmac("SHA-256", key, body, "base64");
  const value = given.trim();
  // Both comparisons always run; either encoding of the same HMAC needs the secret to produce.
  const hexOk = timingSafeEqual(hex, value.toLowerCase());
  const b64Ok = timingSafeEqual(b64, value);
  if (!hexOk && !b64Ok) {
    throw new Error("eSignatures.com delivery refused: the signature does not match.");
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The notification `status` this trigger keeps; omitted = every notification. */
  status?: string;
  sample: ContractEvent;
}

/** Build one eSignatures.com notification webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, ContractEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`eSignatures.com delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("eSignatures.com delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      // Other notifications are acknowledged without a run.
      if (spec.status !== undefined && event.status !== spec.status) return [];
      return [event];
    },
  };
}
