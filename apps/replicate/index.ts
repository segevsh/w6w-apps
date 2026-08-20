/**
 * Replicate — run models, wait for or poll their output, and manage the
 * deployments and trainings around them.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI 3.1 document Replicate serves from the API's own host
 * (`https://api.replicate.com/openapi.json`, fetched 2026-08-18), whose
 * `servers` block states `https://api.replicate.com/v1`.
 *
 * ## A prediction is a background job, and that is the whole app
 *
 * `POST /predictions` answers `status: "starting"` with **no output** — the
 * model has not run. A workflow that reads `output` off that response gets
 * `null` on almost every model, which is the single most likely way to ship a
 * broken Replicate integration.
 *
 * There are three ways to get the result, and this app supports all three
 * without pretending any of them is synchronous:
 *
 *   - **Wait.** Replicate's `Prefer: wait=n` header holds the connection for up
 *     to 60 seconds. Its own wording: *"If this time is exceeded the prediction
 *     will be returned in a `starting` state and need to be retrieved using the
 *     `predictions.get` endpoint."* So the status still has to be checked.
 *   - **Poll.** `prediction-get` until `finished`.
 *   - **Webhook.** The right shape for anything taking minutes, and the only
 *     sensible one for a training.
 *
 * Every action that returns a prediction or a training adds `finished` and
 * `succeeded` booleans, because "is it done" and "did it work" are what a
 * branch actually tests — and because **`failed` arrives with no HTTP error**,
 * so a workflow treating the create's `201` as success is wrong every time a
 * model rejects its input.
 *
 * ## Version, model, deployment: three ways to run the same thing
 *
 *   - **`prediction-create`** takes a pinned **version id**. Reproducible: the
 *     same version today and next year.
 *   - **`prediction-create-from-model`** takes `owner/name` and runs whatever
 *     is current — which can change underneath a workflow without the workflow
 *     changing. Replicate's *official* models are only runnable this way.
 *   - **`deployment-prediction-create`** runs through a deployment, which keeps
 *     hardware warm: no cold start, at the cost of paying while idle.
 *
 * Passing `owner/name` where a version id belongs is caught locally, because
 * the API's error for it is about the field rather than about the confusion.
 *
 * ## On cost
 *
 * Replicate bills **compute time**, not requests. That shapes two things: there
 * is no request allowance for the `quota` health check to report — it is a
 * declared absence saying so — and cancelling matters. `prediction-cancel` and
 * especially `training-cancel` stop the billing clock; a training that is going
 * nowhere costs exactly as much as one that works. `metrics.predict_time` on a
 * finished prediction is the only per-call cost figure the API exposes.
 *
 * Deliberately out of scope:
 *   - **File uploads.** `POST /files` is a multipart upload the sandbox cannot
 *     produce, and model inputs take URLs anyway.
 *   - **Creating, updating and deleting models, versions and deployments.**
 *     Publishing a model is a `cog push` from a machine with the weights on it;
 *     deleting a version is irreversible and not a workflow decision.
 *   - **Streaming output.** Server-sent events are a transport an App's
 *     `ctx.fetch` cannot usefully hand back.
 *   - **The default webhook secret.** It is a signing key, and this app reads
 *     around credentials rather than fetching them.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import predictionCreate from "./actions/prediction-create.ts";
import predictionCreateFromModel from "./actions/prediction-create-from-model.ts";
import deploymentPredictionCreate from "./actions/deployment-prediction-create.ts";
import predictionGet from "./actions/prediction-get.ts";
import predictionList from "./actions/prediction-list.ts";
import predictionCancel from "./actions/prediction-cancel.ts";
import modelSearch from "./actions/model-search.ts";
import modelGet from "./actions/model-get.ts";
import modelList from "./actions/model-list.ts";
import modelVersionList from "./actions/model-version-list.ts";
import modelVersionGet from "./actions/model-version-get.ts";
import modelReadmeGet from "./actions/model-readme-get.ts";
import trainingCreate from "./actions/training-create.ts";
import trainingGet from "./actions/training-get.ts";
import trainingList from "./actions/training-list.ts";
import trainingCancel from "./actions/training-cancel.ts";
import deploymentList from "./actions/deployment-list.ts";
import collectionList from "./actions/collection-list.ts";
import hardwareList from "./actions/hardware-list.ts";
import accountGet from "./actions/account-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // running a model — the reason the app exists
    predictionCreate,
    predictionCreateFromModel,
    deploymentPredictionCreate,
    // getting the answer back
    predictionGet,
    predictionList,
    predictionCancel,
    // finding out what to run, and what it takes
    modelSearch,
    modelGet,
    modelList,
    modelVersionList,
    modelVersionGet,
    modelReadmeGet,
    // fine-tuning
    trainingCreate,
    trainingGet,
    trainingList,
    trainingCancel,
    // the platform around it
    deploymentList,
    collectionList,
    hardwareList,
    accountGet,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
