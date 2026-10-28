import type { AuthDefinition } from "@w6w/types";
import { accountHost, accountName, describeError } from "../lib/client.ts";
import { API_VERSION, rfc1123, sharedKeyAuthorization } from "../lib/signing.ts";

/**
 * The storage account name and one of its two access keys.
 *
 * ## This is the only scheme here that signs inside the hook
 *
 * `apps/s3` and `apps/gcs` both need something the sign hook cannot reach — a
 * separate signing service, or a key an action must not see. Shared Key needs
 * only the request in front of it: the method, the path, the query, the
 * `x-ms-*` headers and the body's length and type. So the whole signature is
 * computed here, per request, and no action ever touches the key.
 *
 * ## The key is the account, entirely
 *
 * There is no user, no role and no scope. Whoever holds this key can read,
 * write and delete **everything in the storage account**, and can mint SAS
 * tokens granting others the same. It cannot be narrowed; the narrower options
 * are a SAS token or Entra ID, and neither is this.
 *
 * That is worth stating because the key is presented in the portal beside a
 * connection string as though it were an ordinary credential. It is closer to a
 * root password, and the only mitigation Azure offers is that there are two of
 * them so one can be rotated while the other is in use.
 *
 * ## The clock matters
 *
 * Every request carries `x-ms-date`, and Azure rejects one more than **15
 * minutes** from its own clock. The failure is a 403 that reads as a permission
 * problem — nothing in it mentions time.
 */
interface SharedKeyCredential {
  account: string;
  key: string;
}

const sharedKey: AuthDefinition = {
  key: "shared-key",
  type: "custom",
  displayName: "Account Key",
  description:
    "A storage account name and one of its access keys. The key grants FULL control of the " +
    "entire account — every container and every blob — and cannot be narrowed; there is no user " +
    "and no role attached to it.",
  connectionLabel: "{{account}}",
  fields: [
    {
      key: "account",
      label: "Storage Account",
      type: "string",
      required: true,
      default: "",
      placeholder: "mystorageaccount",
      hint: "The account name alone — it is the first label of the hostname, so 3 to 24 " +
        "lowercase letters and digits.",
    },
    {
      key: "key",
      label: "Access Key",
      type: "secret",
      required: true,
      hint: "Storage account → Access keys. Either key works; there are two so one can be " +
        "rotated while the other is in use. This is closer to a root password than to an API " +
        "key — a SAS token is the narrower option.",
    },
  ],

  /**
   * Sign the request in front of us.
   *
   * The query has to be read back off the URL rather than passed in, because
   * the canonicalized resource is built from the request as it will actually
   * be sent — including anything the client appended.
   */
  async sign({ request, credential }) {
    const { account, key } = credential as SharedKeyCredential;
    const url = new URL(request.url);

    const query: Record<string, string> = {};
    // The DECODED values: URLSearchParams decodes on read, which is what the
    // canonicalized resource wants.
    url.searchParams.forEach((value, name) => (query[name] = value));

    const headers: Record<string, string> = { ...request.headers };
    headers["x-ms-version"] = API_VERSION;
    headers["x-ms-date"] = rfc1123(Date.now());

    // Empty string when there is no body — not "0". This is the line that
    // makes reads work and writes fail when it is wrong.
    const body = request.body;
    const contentLength = typeof body === "string" && body.length
      ? String(new TextEncoder().encode(body).length)
      : "";

    headers["authorization"] = await sharedKeyAuthorization({
      account,
      key,
      method: request.method,
      path: url.pathname,
      query,
      headers,
      contentLength,
      contentType: headers["content-type"] ?? "",
    });

    request.headers = headers;
    return request;
  },

  /**
   * `GET /?comp=list` — list containers, the smallest call that proves both
   * the account exists and the key signs for it.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SharedKeyCredential> | undefined;
    if (!cred?.account) return { ok: false, message: "credential missing the storage account" };
    if (!cred?.key) return { ok: false, message: "credential missing the access key" };

    let account: string;
    try {
      account = accountName(cred.account);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    const url = `${accountHost(account)}/?comp=list&maxresults=1`;
    const date = rfc1123(Date.now());
    const headers: Record<string, string> = {
      "x-ms-version": API_VERSION,
      "x-ms-date": date,
    };
    try {
      headers["authorization"] = await sharedKeyAuthorization({
        account,
        key: cred.key,
        method: "GET",
        path: "/",
        query: { comp: "list", maxresults: "1" },
        headers,
      });
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(url, { headers });
    } catch (err) {
      return {
        ok: false,
        message: `could not reach ${accountHost(account)}: ${String(err)}. A storage account is ` +
          "a DNS name, so a wrong account name fails to resolve rather than answering 404",
      };
    }
    const body = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        ok: false,
        message: describeError(res.status, body, res.headers.get("x-ms-error-code") ?? undefined),
      };
    }

    return { ok: true, message: `connected to the ${account} storage account` };
  },

  /** Record the account, because it is the hostname every action needs. */
  afterConnect({ credential }) {
    const cred = credential as Partial<SharedKeyCredential>;
    try {
      return { account: accountName(cred?.account) };
    } catch {
      return {};
    }
  },
};

export default sharedKey;
