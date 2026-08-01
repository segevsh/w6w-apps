import type { AuthDefinition } from "@w6w/types";
import { ALGORITHM, computeSigV4 } from "../lib/sigv4.ts";
import { s3Host } from "../lib/regions.ts";
import { xmlError } from "../lib/xml.ts";

/**
 * AWS long-term IAM access keys, signed with AWS Signature Version 4.
 *
 * `type: "custom"` — none of the built-in auth types (`apiKey`, `bearer`,
 * `basic`, `oauth2`) fit: SigV4 is not a single static header value, it is a
 * per-request computed signature over the method, path, query, headers and
 * body. `custom` is the documented escape hatch for exactly this shape (see
 * `docs/build-a-w6w-app.md` — "or whatever type fits a non-standard signing
 * scheme"). There is no `AuthDefinition.custom` config block to populate;
 * the three `fields` below and the `sign`/`test` hooks are the whole
 * contract.
 *
 * The credential never leaves `sign` — SigV4 computation is pure local
 * HMAC-SHA256 (see `lib/sigv4.ts`), so it fits the network-less `sign`
 * sandbox exactly as the app-building doc anticipates.
 */
const auth: AuthDefinition = {
  key: "aws-iam",
  type: "custom",
  displayName: "AWS IAM Access Key",
  description: "Long-term AWS access key ID + secret access key, signed with SigV4.",
  connectionLabel: "AWS S3 ({{region}})",
  fields: [
    { key: "accessKeyId", label: "Access Key ID", type: "secret", required: true },
    { key: "secretAccessKey", label: "Secret Access Key", type: "secret", required: true },
    {
      key: "region",
      label: "Region",
      type: "string",
      required: true,
      default: "us-east-1",
      hint: "AWS region code, e.g. us-east-1. Determines the S3 endpoint every action calls.",
    },
  ],

  async sign({ request, credential }) {
    const { accessKeyId, secretAccessKey, region } = credential as {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
    };
    const { headers, credentialScope, signedHeaders, signature } = await computeSigV4(
      request,
      { accessKeyId, secretAccessKey, region },
      "s3",
    );
    // Only `auth/` may construct an Authorization value (see `computeSigV4`'s
    // docstring in `lib/sigv4.ts`), so that one-line assembly happens here.
    const authorization = `${ALGORITHM} Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return { ...request, headers: { ...headers, authorization } };
  },

  /**
   * ListBuckets (`GET /` with no bucket in the path) is AWS's own documented
   * way to validate a key: it requires only the `s3:ListAllMyBuckets`
   * permission, which every IAM principal that can use S3 at all is expected
   * to hold, and it is the cheapest possible authenticated call — no bucket
   * name, no object body, one round trip.
   */
  async test({ credential }, ctx) {
    const { region } = credential as { region: string };
    const res = await ctx.fetch(`https://${s3Host(region)}/`);
    if (res.ok) return { ok: true };
    const body = await res.text();
    const err = xmlError(body);
    return {
      ok: false,
      message: err?.message
        ? `${err.code ?? res.status}: ${err.message}`
        : `ListBuckets returned ${res.status}`,
    };
  },

  /**
   * Echo the (non-secret) region onto the Connection's `display` so actions
   * can read it via `ctx.connection` without ever touching the credential —
   * the same pattern `mailgun`'s US/EU split and `twilio`'s account SID use.
   * See `lib/connection.ts`.
   */
  afterConnect({ credential }) {
    const { region } = credential as { region: string };
    return { region };
  },
};

export default auth;
