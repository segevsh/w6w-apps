import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import estimateOrder from "./actions/estimate-order.ts";
import giftcardBrandList from "./actions/giftcard-brand-list.ts";
import handwritingStyleList from "./actions/handwriting-style-list.ts";
import imageTemplateList from "./actions/image-template-list.ts";
import mailingListCreate from "./actions/mailing-list-create.ts";
import mailingListGet from "./actions/mailing-list-get.ts";
import mailingListList from "./actions/mailing-list-list.ts";
import mailingListRecipientsList from "./actions/mailing-list-recipients-list.ts";
import messageTemplateList from "./actions/message-template-list.ts";
import orderCancel from "./actions/order-cancel.ts";
import orderItemsList from "./actions/order-items-list.ts";
import orderList from "./actions/order-list.ts";
import orderReplay from "./actions/order-replay.ts";
import orderTrack from "./actions/order-track.ts";
import recipientCreate from "./actions/recipient-create.ts";
import recipientDelete from "./actions/recipient-delete.ts";
import recipientGet from "./actions/recipient-get.ts";
import recipientUpdate from "./actions/recipient-update.ts";
import recipientsCreateMultiple from "./actions/recipients-create-multiple.ts";
import sendGiftcard from "./actions/send-giftcard.ts";
import sendMagnacard from "./actions/send-magnacard.ts";
import sendNotecard from "./actions/send-notecard.ts";
import sendPostcard from "./actions/send-postcard.ts";
import sendWindowedLetter from "./actions/send-windowed-letter.ts";
import sendWindowlessLetter from "./actions/send-windowless-letter.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    estimateOrder,
    giftcardBrandList,
    handwritingStyleList,
    imageTemplateList,
    mailingListCreate,
    mailingListGet,
    mailingListList,
    mailingListRecipientsList,
    messageTemplateList,
    orderCancel,
    orderItemsList,
    orderList,
    orderReplay,
    orderTrack,
    recipientCreate,
    recipientDelete,
    recipientGet,
    recipientUpdate,
    recipientsCreateMultiple,
    sendGiftcard,
    sendMagnacard,
    sendNotecard,
    sendPostcard,
    sendWindowedLetter,
    sendWindowlessLetter,
  ],
  // Personal access token (bearer) only. thanks.io also offers OAuth2; it is not wired here.
  auth: [apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
