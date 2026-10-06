import type { AppDefinition } from "@w6w/types";
import cancelTask from "./actions/cancel-task.ts";
import characterPerformance from "./actions/character-performance.ts";
import createUpload from "./actions/create-upload.ts";
import generateVideo from "./actions/generate-video.ts";
import getAvatar from "./actions/get-avatar.ts";
import getOrganization from "./actions/get-organization.ts";
import getRouter from "./actions/get-router.ts";
import getTask from "./actions/get-task.ts";
import getUsage from "./actions/get-usage.ts";
import getVoice from "./actions/get-voice.ts";
import getWorkflow from "./actions/get-workflow.ts";
import getWorkflowInvocation from "./actions/get-workflow-invocation.ts";
import imageToVideo from "./actions/image-to-video.ts";
import imageUpscale from "./actions/image-upscale.ts";
import listAvatars from "./actions/list-avatars.ts";
import listRouters from "./actions/list-routers.ts";
import listVoices from "./actions/list-voices.ts";
import listWorkflows from "./actions/list-workflows.ts";
import runWorkflow from "./actions/run-workflow.ts";
import soundEffect from "./actions/sound-effect.ts";
import speechToSpeech from "./actions/speech-to-speech.ts";
import textToImage from "./actions/text-to-image.ts";
import textToSpeech from "./actions/text-to-speech.ts";
import textToVideo from "./actions/text-to-video.ts";
import videoToHdr from "./actions/video-to-hdr.ts";
import videoToVideo from "./actions/video-to-video.ts";
import videoUpscale from "./actions/video-upscale.ts";
import voiceDubbing from "./actions/voice-dubbing.ts";
import voiceIsolation from "./actions/voice-isolation.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Runway — generative video, image and audio over the developer API.
 * Findings that shaped this app (2026-10-06):
 *
 * - Every request needs `X-Runway-Version: 2024-11-06`; the client adds it.
 * - Generation is asynchronous: the create call returns a task id, `GET /v1/tasks/{id}`
 *   returns the result. Moderation refusals are a FAILED task, not an HTTP error.
 * - Generation bodies are a union keyed on `model`; valid fields differ per model, so each
 *   action takes the common fields plus an `extra` JSON object merged into the body.
 */
const app: AppDefinition = {
  actions: [
    cancelTask,
    characterPerformance,
    createUpload,
    generateVideo,
    getAvatar,
    getOrganization,
    getRouter,
    getTask,
    getUsage,
    getVoice,
    getWorkflow,
    getWorkflowInvocation,
    imageToVideo,
    imageUpscale,
    listAvatars,
    listRouters,
    listVoices,
    listWorkflows,
    runWorkflow,
    soundEffect,
    speechToSpeech,
    textToImage,
    textToSpeech,
    textToVideo,
    videoToHdr,
    videoToVideo,
    videoUpscale,
    voiceDubbing,
    voiceIsolation,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
