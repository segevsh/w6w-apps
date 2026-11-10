import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import personGet from "./actions/person-get.ts";
import personList from "./actions/person-list.ts";
import personSignup from "./actions/person-signup.ts";
import personUpdate from "./actions/person-update.ts";
import tagCreate from "./actions/tag-create.ts";
import tagGet from "./actions/tag-get.ts";
import tagList from "./actions/tag-list.ts";
import taggingCreate from "./actions/tagging-create.ts";
import taggingDelete from "./actions/tagging-delete.ts";
import taggingGet from "./actions/tagging-get.ts";
import taggingList from "./actions/tagging-list.ts";
import petitionCreate from "./actions/petition-create.ts";
import petitionGet from "./actions/petition-get.ts";
import petitionList from "./actions/petition-list.ts";
import petitionUpdate from "./actions/petition-update.ts";
import signatureGet from "./actions/signature-get.ts";
import signatureList from "./actions/signature-list.ts";
import signatureRecord from "./actions/signature-record.ts";
import signatureUpdate from "./actions/signature-update.ts";
import eventCreate from "./actions/event-create.ts";
import eventGet from "./actions/event-get.ts";
import eventList from "./actions/event-list.ts";
import eventUpdate from "./actions/event-update.ts";
import attendanceGet from "./actions/attendance-get.ts";
import attendanceList from "./actions/attendance-list.ts";
import attendanceRecord from "./actions/attendance-record.ts";
import attendanceUpdate from "./actions/attendance-update.ts";
import formCreate from "./actions/form-create.ts";
import formGet from "./actions/form-get.ts";
import formList from "./actions/form-list.ts";
import formUpdate from "./actions/form-update.ts";
import submissionGet from "./actions/submission-get.ts";
import submissionList from "./actions/submission-list.ts";
import submissionRecord from "./actions/submission-record.ts";
import fundraisingPageCreate from "./actions/fundraising-page-create.ts";
import fundraisingPageGet from "./actions/fundraising-page-get.ts";
import fundraisingPageList from "./actions/fundraising-page-list.ts";
import fundraisingPageUpdate from "./actions/fundraising-page-update.ts";
import donationGet from "./actions/donation-get.ts";
import donationList from "./actions/donation-list.ts";
import donationRecord from "./actions/donation-record.ts";
import advocacyCampaignCreate from "./actions/advocacy-campaign-create.ts";
import advocacyCampaignGet from "./actions/advocacy-campaign-get.ts";
import advocacyCampaignList from "./actions/advocacy-campaign-list.ts";
import advocacyCampaignUpdate from "./actions/advocacy-campaign-update.ts";
import outreachGet from "./actions/outreach-get.ts";
import outreachList from "./actions/outreach-list.ts";
import outreachRecord from "./actions/outreach-record.ts";
import eventCampaignCreate from "./actions/event-campaign-create.ts";
import eventCampaignEventCreate from "./actions/event-campaign-event-create.ts";
import eventCampaignGet from "./actions/event-campaign-get.ts";
import eventCampaignList from "./actions/event-campaign-list.ts";
import eventCampaignUpdate from "./actions/event-campaign-update.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignList from "./actions/campaign-list.ts";
import listGet from "./actions/list-get.ts";
import listList from "./actions/list-list.ts";
import queryGet from "./actions/query-get.ts";
import queryList from "./actions/query-list.ts";
import wrapperGet from "./actions/wrapper-get.ts";
import wrapperList from "./actions/wrapper-list.ts";
import messageCancelSchedule from "./actions/message-cancel-schedule.ts";
import messageCreate from "./actions/message-create.ts";
import messageGet from "./actions/message-get.ts";
import messageList from "./actions/message-list.ts";
import messageSchedule from "./actions/message-schedule.ts";
import messageSend from "./actions/message-send.ts";
import messageStopSend from "./actions/message-stop-send.ts";
import messageUpdate from "./actions/message-update.ts";
import embedGet from "./actions/embed-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Action Network — people, tags, petitions, events, forms, fundraising pages, advocacy campaigns,
 * event campaigns, the action records people leave on them, and mass email, over the v2 (OSDI,
 * HAL+JSON) API. Surveys, unique ID lists, list items and custom fields are not covered; see the
 * README.
 */
export default {
  actions: [
    personGet,
    personList,
    personSignup,
    personUpdate,
    tagCreate,
    tagGet,
    tagList,
    taggingCreate,
    taggingDelete,
    taggingGet,
    taggingList,
    petitionCreate,
    petitionGet,
    petitionList,
    petitionUpdate,
    signatureGet,
    signatureList,
    signatureRecord,
    signatureUpdate,
    eventCreate,
    eventGet,
    eventList,
    eventUpdate,
    attendanceGet,
    attendanceList,
    attendanceRecord,
    attendanceUpdate,
    formCreate,
    formGet,
    formList,
    formUpdate,
    submissionGet,
    submissionList,
    submissionRecord,
    fundraisingPageCreate,
    fundraisingPageGet,
    fundraisingPageList,
    fundraisingPageUpdate,
    donationGet,
    donationList,
    donationRecord,
    advocacyCampaignCreate,
    advocacyCampaignGet,
    advocacyCampaignList,
    advocacyCampaignUpdate,
    outreachGet,
    outreachList,
    outreachRecord,
    eventCampaignCreate,
    eventCampaignEventCreate,
    eventCampaignGet,
    eventCampaignList,
    eventCampaignUpdate,
    campaignGet,
    campaignList,
    listGet,
    listList,
    queryGet,
    queryList,
    wrapperGet,
    wrapperList,
    messageCancelSchedule,
    messageCreate,
    messageGet,
    messageList,
    messageSchedule,
    messageSend,
    messageStopSend,
    messageUpdate,
    embedGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
