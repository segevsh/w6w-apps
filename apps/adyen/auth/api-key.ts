import type { AuthDefinition } from "@w6w/types";
import { baseUrlFor, type Environment, normalizePrefix, parseServiceError } from "../lib/client.ts";

/**
 * Adyen API key, sent as the `X-API-Key` header.
 *
 * Verified 2026-10-05: the Checkout OpenAPI document's `securitySchemes` are
 * `ApiKeyAuth` (`apiKey` / `header` / `X-API-Key`) and `BasicAuth`
 * (`http` / `basic`, a web-service user and password). The API key is the
 * baseline and the only method this app offers; Adyen recommends it over basic
 * auth, and one header is the whole credential.
 *
 * Test and live are separate worlds: a test key is rejected on the live host
 * and the reverse, so the environment is part of the connection. Live also
 * needs the company's URL prefix (see `lib/client.ts`).
 *
 * ## The probe: `POST /paymentMethods`
 *
 * It is a lookup — it lists the payment methods the merchant account offers
 * and creates nothing — and its only required field is `merchantAccount`. Its
 * response is `{paymentMethods, storedPaymentMethods}`, which carries no key
 * material, unlike the whoami endpoints of Mailjet and Follow Up Boss.
 *
 * ## Classification is from the body, never the status alone
 *
 * Adyen's `ServiceError` is `{status, errorCode, errorType, message}`.
 * Measured against `checkout-test.adyen.com` on 2026-10-05: a missing key and a
 * bogus key both answer HTTP 401 with the byte-identical body
 * `{"status":401,"errorCode":"000","message":"HTTP Status Response -
 * Unauthorized","errorType":"security"}`. The vendor's documented examples add:
 *
 *   - 403 / `901` / `security` / "Invalid Merchant Account" — the key was
 *     accepted but cannot act for that merchant account;
 *   - 400 / 422, `errorType: validation` — the key was accepted, the request
 *     was not;
 *   - 500 / `configuration` — the key was accepted, the account is not set up.
 *
 * So `errorType: security` with code `000` is the only "key rejected" answer.
 */
export interface AdyenCredential {
  apiKey: string;
  environment?: Environment;
  livePrefix?: string;
  merchantAccount?: string;
}

function resolveBase(cred: Partial<AdyenCredential>): string {
  const environment: Environment = cred.environment === "live" ? "live" : "test";
  return baseUrlFor(environment, cred.livePrefix);
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "An Adyen API key from Customer Area > Developers > API credentials, the merchant account " +
    "it acts for, and the environment. Live also needs your company's live URL prefix.",
  connectionLabel: "Adyen ({{merchantAccount}}, {{environment}})",
  apiKey: { in: "header", name: "X-API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "Customer Area > Developers > API credentials > your credential > Server settings > " +
        "Authentication > Generate API key. Test and live keys are different keys.",
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      required: true,
      default: "test",
      options: [
        { value: "test", label: "Test — checkout-test.adyen.com" },
        { value: "live", label: "Live — {prefix}-checkout-live.adyenpayments.com" },
      ],
      hint: "A test key is rejected by live and a live key by test.",
    },
    {
      key: "livePrefix",
      label: "Live URL prefix",
      type: "string",
      placeholder: "1797a841fbb37ca7-AdyenDemo",
      showIf: { "==": [{ var: "environment" }, "live"] },
      hint: "Live only. Customer Area > Developers > API URLs > Prefix: a hex string and your " +
        "company name. A pasted live URL is accepted too.",
    },
    {
      key: "merchantAccount",
      label: "Merchant account",
      type: "string",
      required: true,
      placeholder: "YourCompanyECOM",
      hint: "The merchant account name, used by every action that does not set its own.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<AdyenCredential>;
    request.headers["x-api-key"] = (apiKey ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AdyenCredential>;
    const key = (cred?.apiKey ?? "").trim();
    const merchant = (cred?.merchantAccount ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };
    if (!merchant) return { ok: false, message: "credential missing merchantAccount" };

    let base: string;
    try {
      base = resolveBase(cred);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/paymentMethods`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": key,
        },
        body: JSON.stringify({ merchantAccount: merchant }),
      });
    } catch (e) {
      return {
        ok: false,
        message: `could not reach ${base}: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    const text = await res.text().catch(() => "");
    const err = parseServiceError(text);

    if (res.ok) {
      let body: { paymentMethods?: unknown } | null = null;
      try {
        body = JSON.parse(text);
      } catch { /* handled below */ }
      if (body && typeof body === "object" && "paymentMethods" in body) return { ok: true };
      return {
        ok: false,
        message:
          `${base} answered HTTP ${res.status} without a paymentMethods list — that is not ` +
          "the Checkout API. Check the environment and live URL prefix.",
      };
    }

    if (err?.errorType === "security" && err.errorCode === "000") {
      return {
        ok: false,
        message: "Adyen rejected the API key (401, security 000). Check it was copied exactly, " +
          "belongs to this environment (a test key fails on live and the reverse) and is active.",
      };
    }
    if (err?.errorType === "security" && err.errorCode === "901") {
      return {
        ok: false,
        message: `Adyen accepted the API key but not the merchant account "${merchant}" ` +
          "(403, 901 Invalid Merchant Account). Check the name, and that this API credential is " +
          "allowed to use it.",
      };
    }
    if (err?.errorType === "validation" || err?.errorType === "configuration") {
      // The key authenticated; the request or the account setup is what Adyen objected to.
      return { ok: true };
    }
    if (err?.errorType === "security") {
      return {
        ok: false,
        message: `Adyen refused the request (HTTP ${res.status}, code ${err.errorCode}): ` +
          `${err.message ?? ""}. The key may lack a role this call needs.`,
      };
    }
    return {
      ok: false,
      message: `Adyen returned HTTP ${res.status} with no readable error for POST /paymentMethods`,
    };
  },

  /** Publish the environment, base URL and merchant account for actions and the label. */
  afterConnect({ credential }): Record<string, unknown> {
    const cred = credential as Partial<AdyenCredential>;
    try {
      const environment: Environment = cred.environment === "live" ? "live" : "test";
      if (environment === "live") normalizePrefix(cred.livePrefix);
      return {
        environment,
        baseUrl: resolveBase(cred),
        merchantAccount: (cred.merchantAccount ?? "").trim(),
      };
    } catch {
      return {};
    }
  },
};

export default apiKey;
