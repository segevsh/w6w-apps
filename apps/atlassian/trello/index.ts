/**
 * Trello — w6w port of n8n's `Trello` node (REST API v1).
 *
 * Covers the board, list, card, checklist and label resources. Two things from
 * the n8n node are deliberately absent:
 *
 *   - **file attachments.** Trello takes either a URL or a multipart upload;
 *     only the URL form is here, since streaming bytes out of the action
 *     sandbox is not what `ctx.fetch` is for.
 *   - **the webhook trigger.** That is a Trigger, not an Action — port it
 *     against `rfcs/trigger.md` when this pack takes on triggers. It is also
 *     why the credential omits n8n's `oauthSecret` (webhook signature
 *     verification): nothing here would use it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import boardCreate from "./actions/board-create.ts";
import boardGet from "./actions/board-get.ts";
import boardUpdate from "./actions/board-update.ts";
import boardDelete from "./actions/board-delete.ts";
import boardGetLists from "./actions/board-get-lists.ts";
import boardGetMembers from "./actions/board-get-members.ts";
import boardAddMember from "./actions/board-add-member.ts";
import boardRemoveMember from "./actions/board-remove-member.ts";

import listCreate from "./actions/list-create.ts";
import listGet from "./actions/list-get.ts";
import listUpdate from "./actions/list-update.ts";
import listGetCards from "./actions/list-get-cards.ts";
import listArchiveAllCards from "./actions/list-archive-all-cards.ts";

import cardCreate from "./actions/card-create.ts";
import cardGet from "./actions/card-get.ts";
import cardUpdate from "./actions/card-update.ts";
import cardDelete from "./actions/card-delete.ts";
import cardAddComment from "./actions/card-add-comment.ts";
import cardAddAttachment from "./actions/card-add-attachment.ts";
import cardAddLabel from "./actions/card-add-label.ts";
import cardRemoveLabel from "./actions/card-remove-label.ts";

import checklistCreate from "./actions/checklist-create.ts";
import checklistGet from "./actions/checklist-get.ts";
import checklistAddItem from "./actions/checklist-add-item.ts";
import checklistUpdateItem from "./actions/checklist-update-item.ts";

import labelCreate from "./actions/label-create.ts";
import labelGetMany from "./actions/label-get-many.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // board
    boardCreate,
    boardGet,
    boardUpdate,
    boardDelete,
    boardGetLists,
    boardGetMembers,
    boardAddMember,
    boardRemoveMember,
    // list
    listCreate,
    listGet,
    listUpdate,
    listGetCards,
    listArchiveAllCards,
    // card
    cardCreate,
    cardGet,
    cardUpdate,
    cardDelete,
    cardAddComment,
    cardAddAttachment,
    cardAddLabel,
    cardRemoveLabel,
    // checklist
    checklistCreate,
    checklistGet,
    checklistAddItem,
    checklistUpdateItem,
    // label
    labelCreate,
    labelGetMany,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
