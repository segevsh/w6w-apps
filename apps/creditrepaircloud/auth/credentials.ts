import type { AuthDefinition } from "@w6w/types";
import {
  API_BASE,
  buildXml,
  CREDENTIAL_ERROR_CODES,
  ERROR_MESSAGES,
  formBody,
  LEAD_VIEW,
  parseXmlResponse,
  signUrl,
} from "../lib/client.ts";

/**
 * Credit Repair Cloud's two credentials, neither of which fits a built-in auth
 * type.
 *
 * ## Why `custom`
 *
 * `apiauthkey` and `secretkey` are two separate query-string parameters — not a
 * single key, not a key/secret Basic pair, not a bearer token — and the built-in
 * `apiKey` auth type carries exactly one field, one header-or-query name and one
 * optional prefix. So this is `type: "custom"` with two secret fields, and
 * `sign` is what puts them on the wire.
 *
 * ## Both credentials live in the query string, and only `sign` puts them there
 *
 * The vendor's own docs contradict themselves about where the three request
 * parameters go (query string in the sample URL, "pass the xmlData as a POST
 * parameter" in the prose). Verified live on 2026-09-22 with a real
 * `curl -X POST` against the production host: the backend accepts them from
 * either place, interchangeably. This app therefore puts the two **credentials
 * in the query string**, added only here, and lets every Action POST `xmlData`
 * as a form-encoded body — satisfying both documented instructions at once
 * while keeping credentials entirely out of Actions. See `lib/client.ts`.
 *
 * `sign` runs network-less and touches nothing but `request.url`; the body, the
 * method and the headers the Action built are returned untouched.
 */
export interface CreditRepairCloudCredential {
  apiauthkey: string;
  secretkey: string;
}

/**
 * The record id the credential probe asks for: `MQ==`.
 *
 * This is the vendor's own example — the `viewRecord` page's sample XML uses
 * `<id>MQ==</id>`, base64 of the data-protection-encoded string `1`. It is used
 * verbatim, and it is expected to be refused (4413 "Incorrect Client ID" or
 * 4410 in an update context) in every real account: the point of the probe is
 * which error comes back, not that the record exists.
 */
export const PROBE_ID = "MQ==";

/**
 * The probe document, built by the same `buildXml` the Actions use, so the
 * probe cannot drift from the request shape the rest of the app sends.
 */
export const PROBE_XML = buildXml(LEAD_VIEW.root, { id: PROBE_ID });

const credentials: AuthDefinition = {
  key: "credentials",
  type: "custom",
  displayName: "API Key & Secret Key",
  description:
    "Credit Repair Cloud's two credentials from Settings > API: the API key (`apiauthkey`) and " +
    "the secret key (`secretkey`). Both are sent as query-string parameters on every request, " +
    "by the sign hook only.",
  fields: [
    {
      key: "apiauthkey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Credit Repair Cloud > Settings > API > API Key. This is the `apiauthkey` parameter " +
        "the vendor's documentation refers to.",
    },
    {
      key: "secretkey",
      label: "Secret Key",
      type: "secret",
      required: true,
      hint: "The same screen. Without it every call answers error 4406, `Wrong API Key or Secret " +
        "key`, however good the API key is.",
    },
  ],

  /**
   * The only hook that ever sees the raw credential, and it runs with no
   * network: it appends both values to the query string and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<CreditRepairCloudCredential>;
    request.url = signUrl(request.url, cred);
    return request;
  },

  /**
   * Is this credential live?
   *
   * `POST /api/lead/viewRecord` with the vendor's own documented example id —
   * the one call the docs offer that proves the keys without needing a real
   * record to exist.
   *
   * The verdict comes **strictly from the response body**, never from the HTTP
   * status: this vendor answers `200` for a wrong API key and a successful
   * write alike. A body whose `<error_no>` is one of the four
   * credential-invalid codes (4405, 4406, 4407, 4411) means the credential was
   * refused; **anything else** — `<success>True</success>`, or another code
   * such as 4413 "Incorrect Client ID" — means the credential was accepted and
   * only the probe record was wrong, so the Connection is live.
   *
   * Neither key is ever echoed into the message: the failure text is the
   * vendor's own prose, and the URL (which carries both keys) is never included
   * even when the fetch itself throws.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<CreditRepairCloudCredential>;
    const apiauthkey = (cred?.apiauthkey ?? "").trim();
    const secretkey = (cred?.secretkey ?? "").trim();
    if (!apiauthkey) {
      return { ok: false, message: "the credential is missing the API key (apiauthkey)" };
    }
    if (!secretkey) {
      return { ok: false, message: "the credential is missing the secret key (secretkey)" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(signUrl(`${API_BASE}${LEAD_VIEW.path}`, { apiauthkey, secretkey }), {
        method: "POST",
        headers: {
          accept: "text/xml, application/xml",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: formBody(PROBE_XML),
      });
    } catch (err) {
      // Deliberately not `err`-and-URL: the signed URL carries both credentials.
      return { ok: false, message: `could not reach ${API_BASE}: ${String(err)}` };
    }

    const raw = await res.text().catch(() => "");
    const parsed = parseXmlResponse(raw);
    if (!parsed) {
      return {
        ok: false,
        message: "Credit Repair Cloud returned an unreadable response to the credential probe",
      };
    }

    const code = parsed.errorCode;
    if (code !== null && CREDENTIAL_ERROR_CODES.has(code)) {
      const meaning = ERROR_MESSAGES[code] ? ` — ${ERROR_MESSAGES[code]}` : "";
      return {
        ok: false,
        message: `Credit Repair Cloud refused the credentials (error ${code}${meaning}): ` +
          `${parsed.errorMessage ?? "no message"}. Check both values in Credit Repair Cloud > ` +
          "Settings > API, and that the API key is active.",
      };
    }

    if (parsed.success) {
      return { ok: true, message: "the API accepted the credentials" };
    }
    return {
      ok: true,
      message: `the API accepted the credentials — it refused the probe record instead (${
        code !== null ? `error ${code}` : "no error code"
      }${parsed.errorMessage ? `: ${parsed.errorMessage}` : ""})`,
    };
  },
};

export default credentials;
