import type { AuthDefinition } from "@w6w/types";
import { ALGORITHM, computeSigV4, type SignableRequestLike } from "../lib/sigv4.ts";
import { sesHost } from "../lib/regions.ts";
import { parseError } from "../lib/api.ts";

/**
 * AWS IAM access keys (long-term, or temporary with a session token), signed with AWS
 * Signature Version 4 for the `ses` signing name.
 *
 * `type: "custom"` — SigV4 is a per-request computed signature over method, path, query,
 * headers and body, not a static header, so none of the built-in types fit. The credential is
 * only ever touched here; the HMAC computation is pure and fits the network-less `sign` sandbox.
 * The SES v2 signing name is `ses` even though the host is `email.<region>.amazonaws.com`
 * (botocore `signingName: "ses"`) — signing as `email` yields a SignatureDoesNotMatch.
 */
const SIGNING_NAME = "ses";

const auth: AuthDefinition = {
  key: "aws-iam",
  type: "custom",
  displayName: "AWS IAM Access Key",
  description: "AWS access key ID + secret access key (and optional session token), SigV4-signed.",
  connectionLabel: "Amazon SES ({{region}})",
  fields: [
    { key: "accessKeyId", label: "Access Key ID", type: "secret", required: true },
    { key: "secretAccessKey", label: "Secret Access Key", type: "secret", required: true },
    {
      key: "region",
      label: "Region",
      type: "string",
      required: true,
      default: "us-east-1",
      hint:
        "AWS region code, e.g. us-east-1. SES identities, templates and quotas are per-region, so the region picks which SES account state every action sees.",
    },
    {
      key: "sessionToken",
      label: "Session Token",
      type: "secret",
      required: false,
      hint: "Only for temporary (STS) credentials — leave empty for a long-term IAM user key.",
    },
  ],

  async sign({ request, credential }) {
    const { accessKeyId, secretAccessKey, region, sessionToken } = credential as {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      sessionToken?: string;
    };
    const unsigned = sessionToken
      ? { ...request, headers: { ...request.headers, "x-amz-security-token": sessionToken } }
      : request;
    const { headers, credentialScope, signedHeaders, signature } = await computeSigV4(
      unsigned as SignableRequestLike, // action bodies are always JSON strings
      { accessKeyId, secretAccessKey, region },
      SIGNING_NAME,
    );
    // Only `auth/` may construct an Authorization value (the pack's audit enforces it).
    const authorization = `${ALGORITHM} Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return { ...request, headers: { ...headers, authorization } };
  },

  /**
   * GetAccount (`GET /v2/email/account`) is a read of account-level state with no body and no
   * side effect. Classified from the vendor's error TYPE, not the status:
   * `AccessDeniedException` means SigV4 verified and the key is real but the IAM policy omits
   * `ses:GetAccount` (a send-only key is the common least-privilege shape) — the credential is
   * live, so that passes; `UnrecognizedClientException` / `InvalidSignatureException` /
   * `SignatureDoesNotMatch` / `ExpiredTokenException` are a bad credential.
   */
  async test({ credential }, ctx) {
    const { region } = credential as { region: string };
    const res = await ctx.fetch(`https://${sesHost(region)}/v2/email/account`);
    if (res.ok) return { ok: true };
    const err = parseError(res, await res.text());
    if (err.type === "AccessDeniedException") {
      return {
        ok: true,
        message:
          "Credential is valid, but its IAM policy does not allow ses:GetAccount; quota health checks will be unavailable.",
      };
    }
    return {
      ok: false,
      message: err.message
        ? `${err.type ?? res.status}: ${err.message}`
        : `GetAccount returned ${res.status}`,
    };
  },

  /** Echo the (non-secret) region onto the Connection's `display` so actions can pick the host. */
  afterConnect({ credential }) {
    const { region } = credential as { region: string };
    return { region };
  },
};

export default auth;
