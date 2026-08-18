/**
 * Front — work a shared inbox from a workflow: find the conversation, reply or
 * comment on it, tag, assign, snooze, and keep the contact behind it current.
 *
 * Every path, parameter, required body field and response shape here was taken
 * from the OpenAPI document Front publishes itself (`frontapp/front-api-specs`,
 * `core-api/core-api.json`, 147 paths, fetched 2026-08-18), whose `servers`
 * block states `https://api2.frontapp.com`. The auth failure modes and the
 * status page's component list were measured against the live hosts the same
 * day.
 *
 * ## The one thing to get right: reply, or comment?
 *
 * Front's whole point is that a customer conversation and the team's discussion
 * of it live in the same place. Two calls write into it, and they are not
 * interchangeable:
 *
 *   - **`conversation-reply`** sends a message. The customer receives it.
 *   - **`conversation-comment-add`** posts an internal note. They never see it.
 *
 * Getting them the wrong way round emails your internal notes to a customer. So
 * they are named for what they do rather than for the endpoint behind them, and
 * both say so in their own description.
 *
 * ## Replying archives the conversation — unless you say otherwise
 *
 * The sharpest edge in Front's API: `options.archive` **defaults to `true`** on
 * both message routes. A workflow that sends an acknowledgement and expects a
 * human to pick the thread up afterwards will find the thread gone from the
 * queue, and nobody notices until the customer chases.
 *
 * `conversation-reply` and `message-send` therefore default to **not**
 * archiving, deliberately inverting Front's default, and always send the flag
 * explicitly so the API default can never apply by omission.
 *
 * ## Tags: the update route replaces, so this app does not use it
 *
 * `PATCH /conversations/{id}`'s `tag_ids` is documented as "replacing the old
 * conversation tags" — one tag sent to a conversation with three removes the
 * other two and returns success. Front already ships additive routes, so
 * `conversation-update` deliberately has **no tag field** and tagging goes
 * through `conversation-tag-add` / `conversation-tag-remove`, where the intent
 * is written on the action.
 *
 * `custom_fields` on both the conversation and the contact behaves the same way
 * — Front erases what you omit — but has no per-field alternative, so it stays,
 * with the warning on the param.
 *
 * ## Scopes are per-operation, and `test` cannot see them
 *
 * Front's spec annotates every operation with an `x-required-scopes` list (55
 * distinct scopes across the API). A token missing one authenticates perfectly
 * and fails on exactly the call that needs it — so the connection test proves
 * identity, not capability, and the README lists what to tick.
 *
 * Deliberately out of scope:
 *   - **Attachments.** Every attachment path is `multipart/form-data` carrying
 *     binary a sandbox cannot produce — the same call this pack's `documenso`
 *     and `dropbox-sign` apps make.
 *   - **The Channel API.** It is the contract a *custom channel provider*
 *     implements so Front can hand it outbound messages: a webhook receiver,
 *     not something to call.
 *   - **Analytics exports.** They are asynchronous jobs polled to completion,
 *     rate limited at one request per second, and belong to a reporting tool
 *     rather than a workflow step.
 *   - **Knowledge base authoring, rules, shifts, teams and views** — Front
 *     configuration, changed by an admin in the UI, not by an automation.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import conversationList from "./actions/conversation-list.ts";
import conversationSearch from "./actions/conversation-search.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationCreate from "./actions/conversation-create.ts";
import conversationUpdate from "./actions/conversation-update.ts";
import conversationAssign from "./actions/conversation-assign.ts";
import conversationSnooze from "./actions/conversation-snooze.ts";
import conversationTagAdd from "./actions/conversation-tag-add.ts";
import conversationTagRemove from "./actions/conversation-tag-remove.ts";
import conversationFollowerAdd from "./actions/conversation-follower-add.ts";
import conversationFollowerRemove from "./actions/conversation-follower-remove.ts";
import conversationMessageList from "./actions/conversation-message-list.ts";
import conversationEventList from "./actions/conversation-event-list.ts";
import conversationReply from "./actions/conversation-reply.ts";
import conversationCommentAdd from "./actions/conversation-comment-add.ts";
import conversationCommentList from "./actions/conversation-comment-list.ts";
import messageGet from "./actions/message-get.ts";
import messageSend from "./actions/message-send.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactNoteAdd from "./actions/contact-note-add.ts";
import contactConversationList from "./actions/contact-conversation-list.ts";
import inboxList from "./actions/inbox-list.ts";
import inboxConversationList from "./actions/inbox-conversation-list.ts";
import channelList from "./actions/channel-list.ts";
import teammateList from "./actions/teammate-list.ts";
import tagList from "./actions/tag-list.ts";
import statusList from "./actions/status-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // finding the conversation
    conversationList,
    conversationSearch,
    conversationGet,
    inboxConversationList,
    // writing into it — one of these sends, the other does not
    conversationReply,
    conversationCommentAdd,
    // reading it
    conversationMessageList,
    conversationCommentList,
    conversationEventList,
    messageGet,
    // moving it through the queue
    conversationUpdate,
    conversationAssign,
    conversationSnooze,
    conversationTagAdd,
    conversationTagRemove,
    conversationFollowerAdd,
    conversationFollowerRemove,
    // starting something new
    messageSend,
    conversationCreate,
    // the customer behind it
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactNoteAdd,
    contactConversationList,
    // the ids everything else asks for
    inboxList,
    channelList,
    teammateList,
    tagList,
    statusList,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
