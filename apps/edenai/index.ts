/**
 * Eden AI - one API in front of 500+ AI models from 50+ providers: LLMs, embeddings, images,
 * speech, video, and the non-LLM "expert models" (OCR, translation, parsing, web scraping),
 * over the V3 API (`api.edenai.run`).
 *
 * Every path, field and enum here was verified on 2026-10-06 against Eden AI's own OpenAPI
 * document (`https://api.edenai.run/v3/docs/openapi.json`), the live feature catalog
 * (`GET /v3/info?include=schemas`) and live probes of `api.edenai.run` and its status page.
 *
 * The findings that shaped the design:
 *
 *  1. **V3 supersedes V2** (`lib/client.ts`). The documentation index links only `/v3/*`; the
 *     old `/v2` surface is no longer documented, so nothing here targets it.
 *  2. **Two model-naming schemes** (`lib/universal.ts`). LLM routes take `provider/model`
 *     (`openai/gpt-4o`, or a bare name to let Eden AI route); Universal AI takes
 *     `feature/subfeature/provider[/model]` with the feature's fields nested under `input`.
 *  3. **Public routes answer 200 to anyone** (`auth/api-key.ts`). `/v3/info`, `/v3/models` (1.5 MB)
 *     and the per-modality model lists need no key, so none can be the credential probe; the
 *     async-job list is the cheapest route that answers `403 Not authenticated` without a key
 *     and `401 Invalid token` with a wrong one.
 *  4. **A 200 can be a failed call** (`lib/universal.ts`). Universal AI reports a provider
 *     failure as `status: "fail"` inside a 200 envelope; the sync actions throw on it.
 *  5. **No status page on the vendor's own domain** (`health/service.ts`). The real page is the
 *     Instatus page at `app-edenai.instatus.com`; `edenai.statuspage.io` is the unclaimed decoy.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import chatCompletion from "./actions/chat-completion.ts";
import responseCreate from "./actions/response-create.ts";
import embeddingsCreate from "./actions/embeddings-create.ts";
import moderationCreate from "./actions/moderation-create.ts";
import modelsList from "./actions/models-list.ts";
import imageGenerate from "./actions/image-generate.ts";
import speechCreate from "./actions/speech-create.ts";

import videoCreate from "./actions/video-create.ts";
import videoGet from "./actions/video-get.ts";
import videoList from "./actions/video-list.ts";
import videoDelete from "./actions/video-delete.ts";

import translateText from "./actions/translate-text.ts";
import ocrExtract from "./actions/ocr-extract.ts";
import entitiesExtract from "./actions/entities-extract.ts";
import textAiDetect from "./actions/text-ai-detect.ts";
import textAnonymize from "./actions/text-anonymize.ts";
import resumeParse from "./actions/resume-parse.ts";
import webSearch from "./actions/web-search.ts";
import webScrape from "./actions/web-scrape.ts";
import universalAiRun from "./actions/universal-ai-run.ts";

import ocrMultipageStart from "./actions/ocr-multipage-start.ts";
import speechToTextStart from "./actions/speech-to-text-start.ts";
import asyncJobStart from "./actions/async-job-start.ts";
import asyncJobGet from "./actions/async-job-get.ts";
import asyncJobList from "./actions/async-job-list.ts";
import asyncJobDelete from "./actions/async-job-delete.ts";

import fileList from "./actions/file-list.ts";
import fileDelete from "./actions/file-delete.ts";
import featuresList from "./actions/features-list.ts";
import featureGet from "./actions/feature-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // LLM (OpenAI-compatible)
    chatCompletion,
    responseCreate,
    embeddingsCreate,
    moderationCreate,
    modelsList,
    imageGenerate,
    speechCreate,
    // Video generation
    videoCreate,
    videoGet,
    videoList,
    videoDelete,
    // Universal AI, synchronous
    translateText,
    ocrExtract,
    entitiesExtract,
    textAiDetect,
    textAnonymize,
    resumeParse,
    webSearch,
    webScrape,
    universalAiRun,
    // Universal AI, asynchronous (start + poll)
    ocrMultipageStart,
    speechToTextStart,
    asyncJobStart,
    asyncJobGet,
    asyncJobList,
    asyncJobDelete,
    // Files and discovery
    fileList,
    fileDelete,
    featuresList,
    featureGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
