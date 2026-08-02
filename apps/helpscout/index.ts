/**
 * Help Scout — Mailbox API 2.0 (https://api.helpscout.net/v2).
 *
 * Covers the conversation, customer, mailbox (inbox), user and tag resources.
 *
 * The thing that shapes this app, in contrast to Freshdesk/Zendesk, is that
 * Help Scout has NO per-account host — every customer's API lives at the
 * same `api.helpscout.net`, so `w6w.network.allow` names that bare host
 * rather than a wildcard, and there's no domain/subdomain Auth field.
 *
 * Auth is `oauth2` (Authorization Code) rather than PayPal's `custom`
 * (Client Credentials) — see `auth/oauth2.ts` for the researched reasoning.
 *
 * Deliberately absent: attachments, custom fields, snooze, schedules,
 * saved replies, routing config, organizations, properties, ratings,
 * reports, teams, system users, webhooks and workflows — all real Mailbox
 * API surfaces, but well beyond the 8–14 action budget for a first pass.
 * The 13 actions here are the ones named in scope: reading and writing
 * conversations and their threads, customers, and the reference lookups
 * (inboxes, current user, tags) other actions' ID params depend on.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import listConversations from "./actions/list-conversations.ts";
import getConversation from "./actions/get-conversation.ts";
import createConversation from "./actions/create-conversation.ts";
import updateConversation from "./actions/update-conversation.ts";
import addReply from "./actions/add-reply.ts";
import addNote from "./actions/add-note.ts";

import listMailboxes from "./actions/list-mailboxes.ts";

import listCustomers from "./actions/list-customers.ts";
import getCustomer from "./actions/get-customer.ts";
import createCustomer from "./actions/create-customer.ts";
import updateCustomer from "./actions/update-customer.ts";

import getCurrentUser from "./actions/get-current-user.ts";
import listTags from "./actions/list-tags.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // conversation
    listConversations,
    getConversation,
    createConversation,
    updateConversation,
    addReply,
    addNote,
    // mailbox
    listMailboxes,
    // customer
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    // user / tag
    getCurrentUser,
    listTags,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
