import type { ActionDefinition } from "@w6w/types";
import { bucketName, objectName } from "../lib/client.ts";
import { MAX_EXPIRY_SECONDS, signedUrl, signWithIam } from "../lib/signing.ts";
import { BUCKET_PARAM, OBJECT_PARAM } from "../lib/params.ts";

/**
 * Mint a V4 signed URL — **without making a single network call**.
 *
 * ## What this is for
 *
 * A signed URL lets somebody with no Google credentials read or write one
 * object, for a bounded time, over ordinary HTTPS. It is how a workflow hands
 * a report to a customer, or gives a browser a place to upload to, without
 * proxying the bytes through itself and without issuing anybody a credential.
 *
 * For anything of size, this is the right action and `object-download` is the
 * wrong one: the recipient fetches from Cloud Storage directly.
 *
 * ## Nothing is registered with Google
 *
 * The URL is not recorded anywhere. Cloud Storage validates the signature when
 * somebody uses it, which is what makes a signed URL cheap and what makes the
 * next paragraph true.
 *
 * ## The signature comes from IAM Credentials, not from here
 *
 * Signing needs the service account's private key, and an action never sees a
 * credential. So the string-to-sign is built locally — it contains no secret —
 * and `signBlob` signs it with the account's key using the ordinary access
 * token. That needs **Service Account Token Creator on the service account
 * itself**, a permission unrelated to any Cloud Storage role: an account that
 * can read and write every object still gets a 403 here until it is granted.
 *
 * ## A signed URL cannot be revoked
 *
 * The consequence of the same property. There is no list of outstanding URLs
 * and no cancel. Until it expires it works for whoever holds it — a URL in a
 * log file, an email, a browser history or a chat message is live access for
 * its whole lifetime. The only remedies are deleting the object or rotating
 * the signing key, and rotating invalidates every URL that key ever signed.
 *
 * So the lifetime is the control, and this action defaults it to **15
 * minutes** rather than to the seven-day maximum.
 *
 * ## The URL says nothing about whether the object exists
 *
 * Signing is arithmetic on a name. A URL for a misspelled object signs
 * perfectly and 404s when used — which is the right behaviour for a PUT
 * (the object is not supposed to exist yet) and a confusing one for a GET.
 */
const action: ActionDefinition = {
  key: "object-signed-url",
  type: "perform",
  resource: "object",
  title: "Create a signed URL",
  description:
    "Mint a time-limited URL for one object, so a recipient with no Google credentials can fetch " +
    "or upload it directly. It CANNOT BE REVOKED before it expires, so the lifetime is the only " +
    "control. Signing needs Service Account Token Creator, which no Cloud Storage role grants.",
  idempotent: true,
  params: [
    BUCKET_PARAM,
    OBJECT_PARAM,
    {
      key: "method",
      label: "Allows",
      type: "select",
      default: "GET",
      options: [
        { value: "GET", label: "Download — read this object" },
        { value: "PUT", label: "Upload — write this object" },
        { value: "DELETE", label: "Delete this object" },
        { value: "HEAD", label: "Head — metadata only" },
      ],
      hint: "The method is signed, so a download URL cannot be used to write.",
    },
    {
      key: "expiresIn",
      label: "Valid For (seconds)",
      type: "number",
      default: 900,
      hint: "15 minutes by default. Google's maximum is 604800 (7 days), and a longer one signs " +
        "fine and is refused when somebody tries to use it.",
    },
    {
      key: "contentType",
      label: "Required Content-Type",
      type: "string",
      default: "",
      showIf: { "==": [{ var: "method" }, "PUT"] },
      advanced: true,
      hint: "For an upload URL: signs the type, so the uploader must send exactly this.",
    },
  ],
  output: [
    { key: "url", type: "string", label: "The signed URL — treat it as a credential" },
    { key: "expiresAt", type: "string", label: "When it stops working" },
    { key: "method", type: "string", label: "What it permits" },
    { key: "signedHeaders", type: "array", label: "Headers the caller must send unchanged" },
    { key: "revocable", type: "boolean", label: "Always false — this is why the lifetime matters" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);
    const name = objectName(p.object);
    const method = String(p.method ?? "GET").toUpperCase();
    const expiresIn = Number(p.expiresIn ?? 900);

    // The service account's address is public metadata on the connection, not
    // a secret — the key it names never comes near this code.
    const display = (ctx.connection?.display ?? {}) as { clientEmail?: string };
    const clientEmail = String(display.clientEmail ?? "").trim();
    if (!clientEmail) {
      throw new Error(
        "this connection has no service-account email recorded, and signing needs it to name " +
          "which account should sign. Reconnect the app so the address is stored",
      );
    }

    const contentType = String(p.contentType ?? "").trim();
    const result = await signedUrl({
      bucket,
      object: name,
      method,
      expiresInSeconds: expiresIn,
      clientEmail,
      now: Date.now(),
      // Signed by Google with the account's key; the token the auth hook
      // attaches is all this call carries.
      sign: signWithIam(ctx.fetch as never, clientEmail),
      headers: method === "PUT" && contentType ? { "content-type": contentType } : undefined,
    });

    // The object and the lifetime. Never the URL — it is a bearer credential,
    // and a run log is exactly where one should not end up.
    ctx.log("info", "minted a Cloud Storage signed URL", {
      bucket,
      method,
      expiresIn: Math.min(expiresIn, MAX_EXPIRY_SECONDS),
    });

    return {
      url: result.url,
      expiresAt: result.expiresAt,
      method,
      signedHeaders: result.signedHeaders,
      revocable: false,
    };
  },
};

export default action;
