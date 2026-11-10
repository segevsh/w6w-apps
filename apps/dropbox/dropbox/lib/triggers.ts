import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";

/**
 * Dropbox webhook trigger (rfcs/trigger.md, webhook form).
 *
 * Dropbox webhooks are registered by hand in the app's page of the App Console (there is no API
 * to register one) and cover every account that authorized the app, so this is a manual-webhook
 * receiver: `onSubscribe` makes no vendor call and `onUnsubscribe` is a no-op.
 *
 *   - GET (the verification request made when the URI is saved): Dropbox sends a `challenge`
 *     query parameter that must be echoed back as `text/plain`.
 *   - POST (a notification): Dropbox signs the body with HMAC-SHA256 under the app secret and
 *     sends the hex digest in `X-Dropbox-Signature`. The payload lists the accounts that have
 *     changes (`list_folder.accounts`), never the changes themselves; one event per account.
 *
 * Sources (verified 2026-11-10): https://www.dropbox.com/developers/reference/webhooks
 */

const MAX_CHALLENGE_LENGTH = 256;

export interface TriggerParams {
  appSecret?: string;
  accountId?: string;
}

export interface TriggerState {
  callbackUrl: string;
}

export interface FilesChangedEvent {
  accountId: string;
}

const APP_SECRET_PARAM: Param = {
  key: "appSecret",
  label: "App secret",
  type: "secret",
  required: true,
  hint:
    "Dropbox App Console, your app, Settings, App secret. Dropbox signs every notification with it; a notification that does not verify is refused.",
};

const ACCOUNT_PARAM: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  hint: "Only fire for this Dropbox account (`dbid:…`). Leave blank for every account.",
};

export const FILES_CHANGED_OUTPUT: OutputField[] = [
  { key: "accountId", type: "string", label: "Dropbox account ID with new changes" },
];

type Ingest = NonNullable<
  TriggerDefinition<TriggerParams, FilesChangedEvent, TriggerState>["handleIngest"]
>;

/**
 * Throws unless `X-Dropbox-Signature` is the hex HMAC-SHA256 of the raw body under the app secret.
 * Returns the raw body.
 */
export async function verifyDropboxSignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  appSecret: unknown,
): Promise<string> {
  const secret = requireSecret(appSecret);
  const body = requireRawBody(raw);
  const got = header(raw, "x-dropbox-signature");
  const expected = await hmac("SHA-256", secret, body, "hex");
  if (!got || !timingSafeEqual(expected, got)) {
    throw new Error("Dropbox notification refused: the signature does not match.");
  }
  return body;
}

const handleIngest: Ingest = async ({ raw, params }) => {
  const method = String(raw.method).toUpperCase();
  if (method === "GET") {
    // The verification request. An unset app secret means this trigger is not set up: refuse.
    requireSecret(params?.appSecret);
    const challenge = raw.query?.challenge;
    if (
      typeof challenge !== "string" || challenge === "" || challenge.length > MAX_CHALLENGE_LENGTH
    ) {
      throw new Error("Dropbox verification refused: the challenge is missing or malformed.");
    }
    return {
      events: [],
      response: { status: 200, headers: { "content-type": "text/plain" }, body: challenge },
    };
  }
  if (method !== "POST") throw new Error("Dropbox delivers notifications with POST.");
  const body = await verifyDropboxSignature(raw, params?.appSecret);
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    payload = null;
  }
  const listFolder = (payload as { list_folder?: { accounts?: unknown } } | null)?.list_folder;
  if (!listFolder || !Array.isArray(listFolder.accounts)) {
    throw new Error("Not a Dropbox notification: expected list_folder.accounts.");
  }
  const wanted = params?.accountId?.trim();
  return listFolder.accounts
    .filter((a): a is string => typeof a === "string" && a !== "")
    .filter((a) => !wanted || a === wanted)
    .map((accountId) => ({ accountId }));
};

export const filesChanged: TriggerDefinition<TriggerParams, FilesChangedEvent, TriggerState> = {
  key: "files-changed",
  title: "Files Changed (Webhook)",
  description:
    "Fires when Dropbox reports new changes in an account that authorized your app. The run gets the account id; read the changes with List Folder.",
  params: [APP_SECRET_PARAM, ACCOUNT_PARAM],
  output: FILES_CHANGED_OUTPUT,
  sample: { accountId: "dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc" },

  onSubscribe({ callbackUrl }) {
    return { callbackUrl };
  },
  onUnsubscribe() {},
  handleIngest,
  parseOutput({ normalized }) {
    return normalized as FilesChangedEvent;
  },
};
