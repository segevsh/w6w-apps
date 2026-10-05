/**
 * Fellow (fellow.ai, formerly fellow.app) — AI meeting notes: notes, recordings and transcripts,
 * action items, recording upload and webhooks over the Developer API
 * (`https://{subdomain}.fellow.app/api/v1`). See README.md for verified findings.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import meGet from "./actions/me-get.ts";
import recordingGet from "./actions/recording-get.ts";
import recordingList from "./actions/recording-list.ts";
import recordingDelete from "./actions/recording-delete.ts";
import recordingUpload from "./actions/recording-upload.ts";
import uploadGet from "./actions/upload-get.ts";
import uploadList from "./actions/upload-list.ts";
import noteGet from "./actions/note-get.ts";
import noteList from "./actions/note-list.ts";
import noteDelete from "./actions/note-delete.ts";
import noteAgendaWrite from "./actions/note-agenda-write.ts";
import noteAgendaAppend from "./actions/note-agenda-append.ts";
import noteAgendaPrepend from "./actions/note-agenda-prepend.ts";
import noteAgendaFindReplace from "./actions/note-agenda-find-replace.ts";
import actionItemGet from "./actions/action-item-get.ts";
import actionItemList from "./actions/action-item-list.ts";
import actionItemComplete from "./actions/action-item-complete.ts";
import actionItemArchive from "./actions/action-item-archive.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookList from "./actions/webhook-list.ts";

import service from "./health/service.ts";
import rateLimit from "./health/rate-limit.ts";

export default {
  actions: [
    meGet,
    recordingGet,
    recordingList,
    recordingDelete,
    recordingUpload,
    uploadGet,
    uploadList,
    noteGet,
    noteList,
    noteDelete,
    noteAgendaWrite,
    noteAgendaAppend,
    noteAgendaPrepend,
    noteAgendaFindReplace,
    actionItemGet,
    actionItemList,
    actionItemComplete,
    actionItemArchive,
    webhookCreate,
    webhookGet,
    webhookUpdate,
    webhookDelete,
    webhookList,
  ],
  auth: [apiKey],
  healthChecks: [service, rateLimit],
} satisfies AppDefinition;
