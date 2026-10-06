import type { AppDefinition } from "@w6w/types";
import getUserByEmail from "./actions/get-user-by-email.ts";
import getUserById from "./actions/get-user-by-id.ts";
import updateUser from "./actions/update-user.ts";
import bulkUpdateUsers from "./actions/bulk-update-users.ts";
import updateUserEmail from "./actions/update-user-email.ts";
import mergeUsers from "./actions/merge-users.ts";
import deleteUserByEmail from "./actions/delete-user-by-email.ts";
import deleteUserById from "./actions/delete-user-by-id.ts";
import getUserFields from "./actions/get-user-fields.ts";
import getSentMessages from "./actions/get-sent-messages.ts";
import trackEvent from "./actions/track-event.ts";
import trackBulkEvents from "./actions/track-bulk-events.ts";
import getUserEventsByEmail from "./actions/get-user-events-by-email.ts";
import getUserEventsById from "./actions/get-user-events-by-id.ts";
import trackPurchase from "./actions/track-purchase.ts";
import updateCart from "./actions/update-cart.ts";
import listLists from "./actions/list-lists.ts";
import createList from "./actions/create-list.ts";
import deleteList from "./actions/delete-list.ts";
import getListUsers from "./actions/get-list-users.ts";
import getListSize from "./actions/get-list-size.ts";
import subscribeToList from "./actions/subscribe-to-list.ts";
import unsubscribeFromList from "./actions/unsubscribe-from-list.ts";
import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";
import getCampaignMetrics from "./actions/get-campaign-metrics.ts";
import triggerCampaign from "./actions/trigger-campaign.ts";
import sendCampaign from "./actions/send-campaign.ts";
import abortCampaign from "./actions/abort-campaign.ts";
import listJourneys from "./actions/list-journeys.ts";
import triggerJourney from "./actions/trigger-journey.ts";
import listTemplates from "./actions/list-templates.ts";
import getEmailTemplate from "./actions/get-email-template.ts";
import getSmsTemplate from "./actions/get-sms-template.ts";
import getPushTemplate from "./actions/get-push-template.ts";
import listCatalogs from "./actions/list-catalogs.ts";
import createCatalog from "./actions/create-catalog.ts";
import deleteCatalog from "./actions/delete-catalog.ts";
import listCatalogItems from "./actions/list-catalog-items.ts";
import getCatalogItem from "./actions/get-catalog-item.ts";
import replaceCatalogItem from "./actions/replace-catalog-item.ts";
import updateCatalogItem from "./actions/update-catalog-item.ts";
import deleteCatalogItem from "./actions/delete-catalog-item.ts";
import bulkUpsertCatalogItems from "./actions/bulk-upsert-catalog-items.ts";
import listChannels from "./actions/list-channels.ts";
import listMessageTypes from "./actions/list-message-types.ts";
import sendEmail from "./actions/send-email.ts";
import cancelEmail from "./actions/cancel-email.ts";
import sendSms from "./actions/send-sms.ts";
import cancelSms from "./actions/cancel-sms.ts";
import sendPush from "./actions/send-push.ts";
import cancelPush from "./actions/cancel-push.ts";
import updateUserSubscriptions from "./actions/update-user-subscriptions.ts";
import bulkUpdateSubscriptions from "./actions/bulk-update-subscriptions.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    getUserByEmail,
    getUserById,
    updateUser,
    bulkUpdateUsers,
    updateUserEmail,
    mergeUsers,
    deleteUserByEmail,
    deleteUserById,
    getUserFields,
    getSentMessages,
    trackEvent,
    trackBulkEvents,
    getUserEventsByEmail,
    getUserEventsById,
    trackPurchase,
    updateCart,
    listLists,
    createList,
    deleteList,
    getListUsers,
    getListSize,
    subscribeToList,
    unsubscribeFromList,
    listCampaigns,
    getCampaign,
    getCampaignMetrics,
    triggerCampaign,
    sendCampaign,
    abortCampaign,
    listJourneys,
    triggerJourney,
    listTemplates,
    getEmailTemplate,
    getSmsTemplate,
    getPushTemplate,
    listCatalogs,
    createCatalog,
    deleteCatalog,
    listCatalogItems,
    getCatalogItem,
    replaceCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    bulkUpsertCatalogItems,
    listChannels,
    listMessageTypes,
    sendEmail,
    cancelEmail,
    sendSms,
    cancelSms,
    sendPush,
    cancelPush,
    updateUserSubscriptions,
    bulkUpdateSubscriptions,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
