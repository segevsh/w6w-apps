/**
 * WhatsApp — w6w port of n8n's `WhatsApp` node (WhatsApp Business Cloud API,
 * Meta's Graph-API-hosted successor to the deprecated on-prem Business API).
 *
 * Two capabilities from the n8n node are deliberately absent:
 *
 *   - **Multipart media upload.** The Cloud API accepts media as a `file_id`
 *     it already stores, a public HTTP(S) URL it fetches itself, or a
 *     multipart upload. Only the URL form is reachable here — streaming raw
 *     bytes out of the action sandbox is not something `ctx.fetch` is meant
 *     to do (same limitation as this pack's Telegram app).
 *   - **Webhooks / the WhatsApp trigger.** Receiving inbound messages and
 *     status callbacks is a Trigger, not an Action; port it against
 *     `rfcs/trigger.md` when this pack takes on triggers.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import messageSendText from "./actions/message-send-text.ts";
import messageSendTemplate from "./actions/message-send-template.ts";
import messageSendImage from "./actions/message-send-image.ts";
import messageSendDocument from "./actions/message-send-document.ts";
import messageSendVideo from "./actions/message-send-video.ts";
import messageMarkRead from "./actions/message-mark-read.ts";

import templateGetMany from "./actions/template-get-many.ts";

import businessProfileGet from "./actions/business-profile-get.ts";
import businessProfileUpdate from "./actions/business-profile-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // message
    messageSendText,
    messageSendTemplate,
    messageSendImage,
    messageSendDocument,
    messageSendVideo,
    messageMarkRead,
    // template
    templateGetMany,
    // business profile
    businessProfileGet,
    businessProfileUpdate,
  ],
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
