/**
 * Google Vertex AI — Gemini and the rest of Vertex AI through a Google Cloud
 * project, with IAM and regional quota, rather than an API key.
 *
 * Every path, verb, parameter and body field was taken from the discovery
 * document Google serves from the API's own host
 * (`https://aiplatform.googleapis.com/$discovery/rest?version=v1`, fetched
 * 2026-10-05, revision 20260930). The `gemini` app in this pack covers the
 * Gemini Developer API with an API key; this one is the GCP-project surface.
 *
 * Things that shape the app:
 *
 *   - **Regional hosts.** A call to `locations/{l}` must go to
 *     `{l}-aiplatform.googleapis.com` (`global` to `aiplatform.googleapis.com`).
 *     The manifest cannot wildcard `*-aiplatform.googleapis.com`, so the
 *     allowlist is the exact list of 45 locational endpoints the discovery
 *     document publishes plus the global host (`lib/regions.ts`), and the client
 *     refuses any location outside it.
 *   - **Full resource names win.** An id is combined with the connection's
 *     project and location; a full `projects/…/locations/…` name (as a list
 *     result returns) carries its own, and the host follows it.
 *
 * Deliberately out of scope (README lists them): streaming, publisher
 * models' `rawPredict` (partner models), tuning, pipelines, Vector Search, Agent
 * Engine, and creating or deploying models and endpoints.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";

import generateContent from "./actions/generate-content.ts";
import countTokens from "./actions/count-tokens.ts";
import embedContent from "./actions/embed-content.ts";
import predictPublisherModel from "./actions/predict-publisher-model.ts";
import getPublisherModel from "./actions/get-publisher-model.ts";
import listModels from "./actions/list-models.ts";
import getModel from "./actions/get-model.ts";
import listEndpoints from "./actions/list-endpoints.ts";
import getEndpoint from "./actions/get-endpoint.ts";
import predictEndpoint from "./actions/predict-endpoint.ts";
import batchPredictionJobCreate from "./actions/batch-prediction-job-create.ts";
import batchPredictionJobGet from "./actions/batch-prediction-job-get.ts";
import batchPredictionJobList from "./actions/batch-prediction-job-list.ts";
import batchPredictionJobCancel from "./actions/batch-prediction-job-cancel.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // publisher models (Gemini, embeddings, Imagen …)
    generateContent,
    countTokens,
    embedContent,
    predictPublisherModel,
    getPublisherModel,
    // model registry + endpoints
    listModels,
    getModel,
    listEndpoints,
    getEndpoint,
    predictEndpoint,
    // batch prediction
    batchPredictionJobCreate,
    batchPredictionJobGet,
    batchPredictionJobList,
    batchPredictionJobCancel,
  ],
  auth: [oauth2, serviceAccount],
  healthChecks: [service, quota],
} satisfies AppDefinition;
