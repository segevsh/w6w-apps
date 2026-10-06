/**
 * Encharge — marketing automation (people, tags, segments, events, emails) — over the REST API
 * at `api.encharge.io/v1`, plus the Ingest API at `ingest.encharge.io` for tracking events.
 *
 * Verified 2026-10-06 against docs.encharge.io (llms.txt, the API documentation page, the
 * Ingest API and Transactional Email API pages) and the OpenAPI 3 definition it links
 * (encharge-app-resources.s3.amazonaws.com/merged.yaml), with live probes of both hosts.
 * Nothing in the documentation or the OpenAPI document is marked deprecated.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import accountGet from "./actions/account-get.ts";
import personGet from "./actions/person-get.ts";
import personUpsert from "./actions/person-upsert.ts";
import personUpsertBatch from "./actions/person-upsert-batch.ts";
import peopleArchive from "./actions/people-archive.ts";
import personUnsubscribe from "./actions/person-unsubscribe.ts";
import tagAdd from "./actions/tag-add.ts";
import tagRemove from "./actions/tag-remove.ts";
import segmentList from "./actions/segment-list.ts";
import segmentPeopleList from "./actions/segment-people-list.ts";
import fieldList from "./actions/field-list.ts";
import fieldCreate from "./actions/field-create.ts";
import fieldDelete from "./actions/field-delete.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import emailSend from "./actions/email-send.ts";
import eventTrack from "./actions/event-track.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    accountGet,
    personGet,
    personUpsert,
    personUpsertBatch,
    peopleArchive,
    personUnsubscribe,
    tagAdd,
    tagRemove,
    segmentList,
    segmentPeopleList,
    fieldList,
    fieldCreate,
    fieldDelete,
    webhookCreate,
    webhookDelete,
    emailSend,
    eventTrack,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
