import type { AuthDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * System User Access Token (`bearer`).
 *
 * Every Cloud API call carries a plain `Authorization: Bearer <token>` header
 * — no path-embedded secret (unlike Telegram) and no signature scheme (unlike
 * Zendesk's basic auth). The token is a **permanent** token minted for a
 * System User in Meta Business Settings with the `whatsapp_business_messaging`
 * permission (and `whatsapp_business_management` if template-management
 * actions will be used), not the 24-hour temporary token the Graph API
 * Explorer hands out by default.
 *
 * `phoneNumberId` and `wabaId` travel alongside the token as non-secret Auth
 * fields — the Cloud API is centrally hosted at a single fixed host
 * (`graph.facebook.com`; there is no per-tenant subdomain the way Zendesk or
 * Shopify have one), but every call is scoped by a phone-number-id or
 * WABA-id path segment, and an Action must never see the credential to read
 * it out. `afterConnect` echoes both onto the connection's redacted
 * `display`, which is where `lib/client.ts` reads them from.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "System User Access Token",
  description:
    "Meta Business Settings → System Users → generate a token with whatsapp_business_messaging " +
    "(and whatsapp_business_management for template actions). Use a permanent System User token, " +
    "not the 24-hour temporary token from Graph API Explorer.",
  connectionLabel: "{{verifiedName}} ({{phoneNumberId}})",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Permanent token for a System User with whatsapp_business_messaging permission.",
    },
    {
      key: "phoneNumberId",
      label: "Phone Number ID",
      type: "string",
      required: true,
      hint:
        "Meta Business Settings → WhatsApp Accounts → Phone numbers — the numeric ID, not the number itself.",
    },
    {
      key: "wabaId",
      label: "WhatsApp Business Account ID",
      type: "string",
      hint: "Needed only for template-management actions (list templates). " +
        "Meta Business Settings → WhatsApp Accounts.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /{phone-number-id}` is the cheapest authenticated call the Cloud API
   * offers — it needs no `messaging` scope beyond what every token here
   * already has, and unlike sending a message it has no side effect and no
   * customer-service-window constraint, so it is safe to run unattended.
   */
  async test({ credential }, ctx) {
    const { accessToken, phoneNumberId } = credential as {
      accessToken?: string;
      phoneNumberId?: string;
    };
    if (!accessToken || !phoneNumberId) {
      return { ok: false, message: "credential missing accessToken or phoneNumberId" };
    }
    const res = await ctx.fetch(`${BASE_URL}/${phoneNumberId}?fields=verified_name`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    if (!res.ok) {
      return { ok: false, message: body.error?.message ?? `Graph API returned ${res.status}` };
    }
    return { ok: true };
  },

  /** Labels the connection with the phone number's verified business name. */
  async afterConnect({ credential }, ctx) {
    const { accessToken, phoneNumberId, wabaId } = credential as {
      accessToken?: string;
      phoneNumberId?: string;
      wabaId?: string;
    };
    if (!phoneNumberId) return {};
    const res = await ctx.fetch(
      `${BASE_URL}/${phoneNumberId}?fields=verified_name,display_phone_number`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return { phoneNumberId, wabaId };
    const body = await res.json().catch(() => ({})) as {
      verified_name?: string;
      display_phone_number?: string;
    };
    return {
      phoneNumberId,
      wabaId,
      verifiedName: body.verified_name,
      displayPhoneNumber: body.display_phone_number,
    };
  },
};

export default accessToken;
