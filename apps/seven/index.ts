/**
 * seven (seven.io, formerly sms77) — SMS, voice and phone-number lookup gateway — over the HTTP
 * API at `gateway.seven.io/api`.
 *
 * Verified 2026-10-06 against docs.seven.io/en/rest-api/* and live probes of the gateway. The
 * docs publish no OpenAPI document. Not yet covered (documented, deliberately left out): sending
 * RCS and WhatsApp, SMS file attachments, subaccount management, booking and updating phone
 * numbers, sender-ID validation (it places a phone call), request signing and OAuth2.
 *
 * The gateway answers HTTP 200 to everything; failures are numeric codes in the body.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import analyticsGet from "./actions/analytics-get.ts";
import balanceGet from "./actions/balance-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import groupCreate from "./actions/group-create.ts";
import groupDelete from "./actions/group-delete.ts";
import groupGet from "./actions/group-get.ts";
import groupList from "./actions/group-list.ts";
import groupUpdate from "./actions/group-update.ts";
import journalInbound from "./actions/journal-inbound.ts";
import journalOutbound from "./actions/journal-outbound.ts";
import journalVoice from "./actions/journal-voice.ts";
import lookupCnam from "./actions/lookup-cnam.ts";
import lookupFormat from "./actions/lookup-format.ts";
import lookupHlr from "./actions/lookup-hlr.ts";
import lookupMnp from "./actions/lookup-mnp.ts";
import lookupRcs from "./actions/lookup-rcs.ts";
import numberActiveGet from "./actions/number-active-get.ts";
import numberActiveList from "./actions/number-active-list.ts";
import numberAvailableList from "./actions/number-available-list.ts";
import pricingGet from "./actions/pricing-get.ts";
import smsDelete from "./actions/sms-delete.ts";
import smsSend from "./actions/sms-send.ts";
import voiceCall from "./actions/voice-call.ts";
import voiceHangup from "./actions/voice-hangup.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookList from "./actions/webhook-list.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    analyticsGet,
    balanceGet,
    contactCreate,
    contactDelete,
    contactGet,
    contactList,
    contactUpdate,
    groupCreate,
    groupDelete,
    groupGet,
    groupList,
    groupUpdate,
    journalInbound,
    journalOutbound,
    journalVoice,
    lookupCnam,
    lookupFormat,
    lookupHlr,
    lookupMnp,
    lookupRcs,
    numberActiveGet,
    numberActiveList,
    numberAvailableList,
    pricingGet,
    smsDelete,
    smsSend,
    voiceCall,
    voiceHangup,
    webhookCreate,
    webhookDelete,
    webhookList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
