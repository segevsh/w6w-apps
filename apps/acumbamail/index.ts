/**
 * Acumbamail: email and SMS marketing over the REST API at
 * `https://acumbamail.com/api/1/{function}/`.
 *
 * Every function name, parameter and return value here was read on 2026-10-06
 * from Acumbamail's own API reference (`acumbamail.com/en/apidoc/function/{name}/`)
 * and probed live (the only observable behaviour without a token is the 401
 * `Unauthorized` answer). The reference has no function index, so each name was
 * verified by fetching its page; see README.md for what was left out.
 */
import type { AppDefinition } from "@w6w/types";
import authToken from "./auth/auth-token.ts";
import listGetAll from "./actions/list-get-all.ts";
import listCreate from "./actions/list-create.ts";
import listDelete from "./actions/list-delete.ts";
import listStatsGet from "./actions/list-stats-get.ts";
import listFieldsGet from "./actions/list-fields-get.ts";
import mergeFieldsGet from "./actions/merge-fields-get.ts";
import mergeTagAdd from "./actions/merge-tag-add.ts";
import subscriberAdd from "./actions/subscriber-add.ts";
import subscribersBatchAdd from "./actions/subscribers-batch-add.ts";
import subscriberDelete from "./actions/subscriber-delete.ts";
import subscriberUnsubscribe from "./actions/subscriber-unsubscribe.ts";
import subscribersList from "./actions/subscribers-list.ts";
import subscriberSearch from "./actions/subscriber-search.ts";
import subscriberDetailsGet from "./actions/subscriber-details-get.ts";
import listSubscriberStatsGet from "./actions/list-subscriber-stats-get.ts";
import campaignsList from "./actions/campaigns-list.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignInfoGet from "./actions/campaign-info-get.ts";
import campaignTotalsGet from "./actions/campaign-totals-get.ts";
import campaignOpenersList from "./actions/campaign-openers-list.ts";
import campaignClicksList from "./actions/campaign-clicks-list.ts";
import campaignLinksGet from "./actions/campaign-links-get.ts";
import campaignIspStatsGet from "./actions/campaign-isp-stats-get.ts";
import campaignBrowserStatsGet from "./actions/campaign-browser-stats-get.ts";
import campaignOsStatsGet from "./actions/campaign-os-stats-get.ts";
import statsByDateGet from "./actions/stats-by-date-get.ts";
import templatesList from "./actions/templates-list.ts";
import templateCreate from "./actions/template-create.ts";
import templateDuplicate from "./actions/template-duplicate.ts";
import emailSend from "./actions/email-send.ts";
import smsSend from "./actions/sms-send.ts";
import listWebhookConfigure from "./actions/list-webhook-configure.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listGetAll,
    listCreate,
    listDelete,
    listStatsGet,
    listFieldsGet,
    mergeFieldsGet,
    mergeTagAdd,
    subscriberAdd,
    subscribersBatchAdd,
    subscriberDelete,
    subscriberUnsubscribe,
    subscribersList,
    subscriberSearch,
    subscriberDetailsGet,
    listSubscriberStatsGet,
    campaignsList,
    campaignCreate,
    campaignInfoGet,
    campaignTotalsGet,
    campaignOpenersList,
    campaignClicksList,
    campaignLinksGet,
    campaignIspStatsGet,
    campaignBrowserStatsGet,
    campaignOsStatsGet,
    statsByDateGet,
    templatesList,
    templateCreate,
    templateDuplicate,
    emailSend,
    smsSend,
    listWebhookConfigure,
  ],
  auth: [authToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
