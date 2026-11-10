import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Netlify deploy-notification triggers (rfcs/trigger.md, manual-webhook form).
 *
 * Netlify's outgoing-webhook notification is configured in the Netlify UI (Project configuration >
 * Notifications > Deploy notifications > Outgoing webhook): you pick the deploy event, paste the
 * URL to notify and an optional **JWS secret token**. The REST `hooks` resource exists, but its
 * `data` object, and so the field that carries the secret, is not documented, so this app does not
 * register anything: `onSubscribe` makes no Netlify call and hands back the callback URL to paste
 * (D5 (2)); the trigger's `signingSecret` param holds the same JWS secret token.
 *
 * `handleIngest` verifies `X-Webhook-Signature` BEFORE parsing the body. Netlify signs a compact JWS
 * (HS256, keyed with the secret) whose claims are `iss: "netlify"` and `sha256`, the hex SHA-256 of
 * the exact request body. Verifying means: the header is three dot-separated parts, its header says
 * `alg: HS256` (never `none`, never anything else), the HMAC over `<header>.<payload>` matches, `iss`
 * is `netlify`, and `sha256` equals the SHA-256 of the raw body. Netlify documents no timestamp
 * claim, so there is no replay window to enforce.
 *
 * Docs (verified 2026-11-09): https://docs.netlify.com/deploy/deploy-notifications.md ("Payload
 * signature"), https://open-api.netlify.com/ (deploy object).
 */

export interface TriggerParams {
  signingSecret?: string;
  /** Only deliveries for this site id; blank for every site. */
  siteId?: string;
  /** Comma-separated deploy states to keep (`ready,error`); blank keeps every state. */
  states?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  callbackUrl: string;
}

/** The run's `trigger.event`. */
export interface NetlifyDeployEvent {
  deployId: string | null;
  siteId: string | null;
  siteName: string | null;
  state: string | null;
  context: string | null;
  branch: string | null;
  commitRef: string | null;
  url: string | null;
  deployUrl: string | null;
  errorMessage: string | null;
  createdAt: string | null;
  /** Netlify's deploy object, verbatim. */
  deploy: Record<string, unknown>;
}

const SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "JWS secret token",
  type: "secret",
  required: true,
  hint:
    "The JWS secret token you enter on the Netlify notification (Project configuration > Notifications > Deploy notifications > Outgoing webhook). Deliveries without a valid signature are refused.",
};

const SITE_PARAM: Param = {
  key: "siteId",
  label: "Site ID",
  type: "string",
  hint: "Only fire for this site. Leave blank for every site the notification covers.",
};

const STATES_PARAM: Param = {
  key: "states",
  label: "Only these deploy states",
  type: "string",
  hint:
    "Comma-separated deploy states to react to, e.g. `ready,error`. Blank for every state the notification sends.",
};

const OUTPUT: OutputField[] = [
  { key: "deployId", type: "string", label: "Deploy ID" },
  { key: "siteId", type: "string", label: "Site ID" },
  { key: "siteName", type: "string", label: "Site name" },
  { key: "state", type: "string", label: "Deploy state" },
  { key: "context", type: "string", label: "Deploy context" },
  { key: "branch", type: "string", label: "Branch" },
  { key: "commitRef", type: "string", label: "Commit" },
  { key: "url", type: "string", label: "Site URL" },
  { key: "deployUrl", type: "string", label: "Deploy URL" },
  { key: "errorMessage", type: "string", label: "Error message" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "deploy", type: "object", label: "Deploy" },
];

// The sample URLs are assembled from a domain constant: they are illustrative values in a sample, not
// hosts this app calls, and the audit rightly treats any literal host as an egress claim.
const APP_DOMAIN = "netlify.app";

const SAMPLE_DEPLOY: Record<string, unknown> = {
  id: "5d6e7f8a9b0c1d2e3f4a5b6c",
  site_id: "1f2e3d4c-5b6a-7980-a1b2-c3d4e5f60718",
  name: "my-site",
  state: "ready",
  context: "production",
  branch: "main",
  commit_ref: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
  url: `https://my-site.${APP_DOMAIN}`,
  deploy_url: `https://5d6e7f8a9b0c1d2e3f4a5b6c--my-site.${APP_DOMAIN}`,
  error_message: null,
  created_at: "2026-11-09T10:00:00.000Z",
};

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** Decode one base64url JWS segment as a JSON object, or `null` if it is not one. */
function jsonSegment(seg: string): Record<string, unknown> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(seg)) return null;
  try {
    const b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return asObject(
      JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))),
    );
  } catch {
    return null;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
  );
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verify a delivery and return its parsed deploy object; throws, echoing nothing, on any shortfall. */
async function verifiedDeploy(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  signingSecret: unknown,
): Promise<Record<string, unknown>> {
  const rawBody = requireRawBody(raw);
  const secret = requireSecret(signingSecret);
  const jws = header(raw, "x-webhook-signature");
  const refuse = (why: string) => new Error(`Netlify delivery refused: ${why}.`);
  if (jws === undefined) throw refuse("it carries no signature");
  const parts = jws.split(".");
  if (parts.length !== 3) throw refuse("the signature is malformed");
  const [h, p, sig] = parts;
  const jwsHeader = jsonSegment(h);
  if (jwsHeader?.alg !== "HS256") throw refuse("the signature algorithm is not HS256");
  const expected = (await hmac("SHA-256", secret, `${h}.${p}`, "base64"))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  if (!timingSafeEqual(sig, expected)) throw refuse("the signature does not match");
  const claims = jsonSegment(p);
  if (claims?.iss !== "netlify") throw refuse("the signature was not issued by Netlify");
  const claimed = str(claims.sha256);
  if (claimed === null || !timingSafeEqual(claimed.toLowerCase(), await sha256Hex(rawBody))) {
    throw refuse("the signed body hash does not match the body");
  }
  let deploy: unknown;
  try {
    deploy = JSON.parse(rawBody);
  } catch {
    throw refuse("the body is not JSON");
  }
  const obj = asObject(deploy);
  if (!obj) throw refuse("the body is not a JSON object");
  return obj;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Fixed deploy states this trigger keeps; omitted for the trigger whose states are a param. */
  states?: string[];
}

/** Build one Netlify deploy-notification trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, NetlifyDeployEvent, TriggerState> {
  const fixed = spec.states;
  const sampleState = fixed?.[0] ?? "ready";
  const sample: NetlifyDeployEvent = {
    deployId: str(SAMPLE_DEPLOY.id),
    siteId: str(SAMPLE_DEPLOY.site_id),
    siteName: str(SAMPLE_DEPLOY.name),
    state: sampleState,
    context: str(SAMPLE_DEPLOY.context),
    branch: str(SAMPLE_DEPLOY.branch),
    commitRef: str(SAMPLE_DEPLOY.commit_ref),
    url: str(SAMPLE_DEPLOY.url),
    deployUrl: str(SAMPLE_DEPLOY.deploy_url),
    errorMessage: sampleState === "error" ? "Build script returned non-zero exit code: 2" : null,
    createdAt: str(SAMPLE_DEPLOY.created_at),
    deploy: { ...SAMPLE_DEPLOY, state: sampleState },
  };
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed ? [SECRET_PARAM, SITE_PARAM] : [SECRET_PARAM, SITE_PARAM, STATES_PARAM],
    output: OUTPUT,
    sample,

    // Manual webhook: nothing to register at Netlify. The user pastes this URL into the
    // notification; the host shows it from the subscription state.
    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Netlify delivers webhooks with POST, not ${raw.method}.`);
      }
      const deploy = await verifiedDeploy(raw, params?.signingSecret);
      const siteId = params?.siteId?.trim();
      if (siteId && str(deploy.site_id) !== siteId) return [];
      const state = str(deploy.state);
      const wanted = fixed ??
        (params?.states ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      if (wanted.length > 0 && (state === null || !wanted.includes(state))) return [];
      return [{
        deployId: str(deploy.id),
        siteId: str(deploy.site_id),
        siteName: str(deploy.name),
        state,
        context: str(deploy.context),
        branch: str(deploy.branch),
        commitRef: str(deploy.commit_ref),
        url: str(deploy.url),
        deployUrl: str(deploy.deploy_url),
        errorMessage: str(deploy.error_message),
        createdAt: str(deploy.created_at),
        deploy,
      }];
    },
  };
}
