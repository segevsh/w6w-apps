import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import transcriptionStart from "./actions/transcription-start.ts";
import transcriptionGet from "./actions/transcription-get.ts";
import transcriptionList from "./actions/transcription-list.ts";
import transcriptionDelete from "./actions/transcription-delete.ts";
import audioUploadUrl from "./actions/audio-upload-url.ts";
import modelList from "./actions/model-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Gladia — speech-to-text. Pre-recorded jobs only (`/v2/pre-recorded`); the deprecated
 * `/v2/transcription*` aliases and live WebSocket streaming are not covered.
 */
export default {
  actions: [
    transcriptionStart,
    transcriptionGet,
    transcriptionList,
    transcriptionDelete,
    audioUploadUrl,
    modelList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
