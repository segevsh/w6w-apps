import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import listAccessibleCustomers from "./actions/list-accessible-customers.ts";
import getCustomer from "./actions/get-customer.ts";
import listCustomerClients from "./actions/list-customer-clients.ts";
import search from "./actions/search.ts";
import performanceReport from "./actions/performance-report.ts";
import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";
import createCampaign from "./actions/create-campaign.ts";
import updateCampaign from "./actions/update-campaign.ts";
import createCampaignBudget from "./actions/create-campaign-budget.ts";
import listAdGroups from "./actions/list-ad-groups.ts";
import createAdGroup from "./actions/create-ad-group.ts";
import listAds from "./actions/list-ads.ts";
import listKeywords from "./actions/list-keywords.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listAccessibleCustomers,
    getCustomer,
    listCustomerClients,
    search,
    performanceReport,
    listCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    createCampaignBudget,
    listAdGroups,
    createAdGroup,
    listAds,
    listKeywords,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
