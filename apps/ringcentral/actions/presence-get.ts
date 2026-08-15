import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, flag, RingCentralClient } from "../lib/client.ts";
import { accountIdParam, extensionIdParam } from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/extension/{extensionId}/presence` —
 * an extension's aggregated presence: telephony status, DND status,
 * user-published status message. Needs `ReadPresence` (app) /
 * `ReadPresenceStatus` (user).
 *
 * The vendor documents that several extension types (Department,
 * Announcement-only, Voicemail-only, Fax User, Paging Only, Shared Lines
 * Group, IVR Menu, Application Extension, Park Location) always answer
 * `presenceStatus: "Offline"` with `telephonyStatus`/`message`/`userStatus`/
 * `dndStatus` omitted entirely — that is the documented shape for those
 * types, not a sign the read failed.
 */
interface Input {
  accountId?: string;
  extensionId?: string;
  detailedTelephonyState?: boolean;
  sipData?: boolean;
}

const presenceGet: ActionDefinition<Input> = {
  key: "presence-get",
  type: "read",
  resource: "presence",
  title: "Get Presence",
  description: "Fetch an extension's aggregated presence and telephony status.",
  params: [
    accountIdParam,
    extensionIdParam,
    {
      key: "detailedTelephonyState",
      label: "Detailed telephony state",
      type: "boolean",
    },
    { key: "sipData", label: "Include SIP data", type: "boolean" },
  ],
  output: [
    { key: "presenceStatus", type: "string", label: "Offline / Busy / Available" },
    { key: "telephonyStatus", type: "string", label: "Telephony presence" },
    { key: "userStatus", type: "string", label: "User-published status" },
    { key: "dndStatus", type: "string", label: "Do-not-disturb status" },
    { key: "message", type: "string", label: "Custom status message" },
    { key: "activeCalls", type: "array", label: "Active calls, if any" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${
        encodeId(input.extensionId)
      }/presence`,
      {
        query: {
          detailedTelephonyState: flag(input.detailedTelephonyState),
          sipData: flag(input.sipData),
        },
      },
    );
  },
};

export default presenceGet;
