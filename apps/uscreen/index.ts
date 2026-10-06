/**
 * Uscreen (uscreen.tv) — video membership / OTT platform. Customers, product access,
 * subscriptions, groups, invoices, offers, content visibility and view analytics over the
 * Publisher API (`https://uscreen.io/publisher_api/v1`). See README.md for verified findings.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import viewsList from "./actions/views-list.ts";
import watchTimeGet from "./actions/watch-time-get.ts";
import viewsSummaryList from "./actions/views-summary-list.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerSsoLinkCreate from "./actions/customer-sso-link-create.ts";
import accessList from "./actions/access-list.ts";
import accessGet from "./actions/access-get.ts";
import accessGrant from "./actions/access-grant.ts";
import accessRevoke from "./actions/access-revoke.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import emailTopicList from "./actions/email-topic-list.ts";
import groupList from "./actions/group-list.ts";
import groupCreate from "./actions/group-create.ts";
import groupDelete from "./actions/group-delete.ts";
import groupMemberList from "./actions/group-member-list.ts";
import groupMemberAdd from "./actions/group-member-add.ts";
import groupMemberRemove from "./actions/group-member-remove.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import offerList from "./actions/offer-list.ts";
import offerGet from "./actions/offer-get.ts";
import contentList from "./actions/content-list.ts";
import contentGet from "./actions/content-get.ts";
import playlistItemList from "./actions/playlist-item-list.ts";
import playlistItemGet from "./actions/playlist-item-get.ts";
import contentPublish from "./actions/content-publish.ts";
import contentUnpublish from "./actions/content-unpublish.ts";
import contentSchedule from "./actions/content-schedule.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    viewsList,
    watchTimeGet,
    viewsSummaryList,
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    customerSsoLinkCreate,
    accessList,
    accessGet,
    accessGrant,
    accessRevoke,
    subscriptionGet,
    subscriptionCreate,
    subscriptionCancel,
    emailTopicList,
    groupList,
    groupCreate,
    groupDelete,
    groupMemberList,
    groupMemberAdd,
    groupMemberRemove,
    invoiceList,
    invoiceGet,
    offerList,
    offerGet,
    contentList,
    contentGet,
    playlistItemList,
    playlistItemGet,
    contentPublish,
    contentUnpublish,
    contentSchedule,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
