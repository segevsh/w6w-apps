import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import synthesizeSpeech from "./actions/synthesize-speech.ts";
import listVoices from "./actions/list-voices.ts";
import listClonedVoices from "./actions/list-cloned-voices.ts";
import getVoiceCloneStatus from "./actions/get-voice-clone-status.ts";
import deleteClonedVoice from "./actions/delete-cloned-voice.ts";
import convertVoice from "./actions/convert-voice.ts";
import translateText from "./actions/translate-text.ts";
import listDubbingSourceLanguages from "./actions/list-dubbing-source-languages.ts";
import listDubbingDestinationLanguages from "./actions/list-dubbing-destination-languages.ts";
import createDubbingJob from "./actions/create-dubbing-job.ts";
import createDubbingJobForProject from "./actions/create-dubbing-job-for-project.ts";
import getDubbingJobStatus from "./actions/get-dubbing-job-status.ts";
import createDubbingProject from "./actions/create-dubbing-project.ts";
import listDubbingProjects from "./actions/list-dubbing-projects.ts";
import updateDubbingProject from "./actions/update-dubbing-project.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Murf — the JSON and URL-driven operations of the published OpenAPI reference
 * (murf.ai/api/docs/openapi.json): Gen2 speech synthesis, voices, cloned voices, voice changer,
 * translation and the Murf Dub dubbing API. Streaming, WebSocket and file-upload endpoints are
 * left out (see the README).
 */
export default {
  actions: [
    synthesizeSpeech,
    listVoices,
    listClonedVoices,
    getVoiceCloneStatus,
    deleteClonedVoice,
    convertVoice,
    translateText,
    listDubbingSourceLanguages,
    listDubbingDestinationLanguages,
    createDubbingJob,
    createDubbingJobForProject,
    getDubbingJobStatus,
    createDubbingProject,
    listDubbingProjects,
    updateDubbingProject,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
