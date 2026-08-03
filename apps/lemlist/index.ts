import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";

import listCampaignLeads from "./actions/list-campaign-leads.ts";
import addLeadToCampaign from "./actions/add-lead-to-campaign.ts";
import deleteLeadFromCampaign from "./actions/delete-lead-from-campaign.ts";
import getLead from "./actions/get-lead.ts";
import markLeadInterested from "./actions/mark-lead-interested.ts";
import markLeadNotInterested from "./actions/mark-lead-not-interested.ts";
import pauseLead from "./actions/pause-lead.ts";
import resumeLead from "./actions/resume-lead.ts";

import listActivities from "./actions/list-activities.ts";

import getTeam from "./actions/get-team.ts";
import getTeamCredits from "./actions/get-team-credits.ts";
import listTeamSenders from "./actions/list-team-senders.ts";

import listSchedules from "./actions/list-schedules.ts";

import listUnsubscribes from "./actions/list-unsubscribes.ts";
import addUnsubscribe from "./actions/add-unsubscribe.ts";
import deleteUnsubscribe from "./actions/delete-unsubscribe.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Campaign — the outreach container everything else hangs off
    listCampaigns,
    getCampaign,
    // Lead — a person inside a campaign, and its state transitions
    listCampaignLeads,
    addLeadToCampaign,
    deleteLeadFromCampaign,
    getLead,
    markLeadInterested,
    markLeadNotInterested,
    pauseLead,
    resumeLead,
    // Activity — the history of every step performed
    listActivities,
    // Team — who sends, and what they can spend
    getTeam,
    getTeamCredits,
    listTeamSenders,
    // Schedule — the sending window a campaign runs in
    listSchedules,
    // Unsubscribe — the suppression list (lemlist's v2 "variables" surface)
    listUnsubscribes,
    addUnsubscribe,
    deleteUnsubscribe,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
