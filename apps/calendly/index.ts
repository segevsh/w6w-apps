import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import oauth2 from "./auth/oauth2.ts";
import userGetCurrent from "./actions/user-get-current.ts";
import userGet from "./actions/user-get.ts";
import eventTypeGetMany from "./actions/event-type-get-many.ts";
import eventTypeGet from "./actions/event-type-get.ts";
import scheduledEventGetMany from "./actions/scheduled-event-get-many.ts";
import scheduledEventGet from "./actions/scheduled-event-get.ts";
import inviteeGetMany from "./actions/invitee-get-many.ts";
import inviteeGet from "./actions/invitee-get.ts";
import schedulingLinkCreate from "./actions/scheduling-link-create.ts";
import webhookSubscriptionCreate from "./actions/webhook-subscription-create.ts";
import webhookSubscriptionGetMany from "./actions/webhook-subscription-get-many.ts";
import webhookSubscriptionDelete from "./actions/webhook-subscription-delete.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // user
    userGetCurrent,
    userGet,
    // event-type
    eventTypeGetMany,
    eventTypeGet,
    // scheduled-event
    scheduledEventGetMany,
    scheduledEventGet,
    // invitee
    inviteeGetMany,
    inviteeGet,
    // scheduling-link
    schedulingLinkCreate,
    // webhook-subscription
    webhookSubscriptionCreate,
    webhookSubscriptionGetMany,
    webhookSubscriptionDelete,
  ],
  // PAT first (single-account default), OAuth for public integrations.
  auth: [personalAccessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
