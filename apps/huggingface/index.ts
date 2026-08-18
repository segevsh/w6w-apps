/**
 * Hugging Face — the Hub and the Inference router.
 *
 * `lib/client.ts` covers what is unusual: three hosts behind one token,
 * repository ids that get renamed and redirect, rate limits reported in the
 * RFC-draft `ratelimit` header rather than `X-RateLimit-*`, and gated
 * repositories whose gate no credential can open.
 */
import type { AppDefinition } from "@w6w/types";

import token from "./auth/token.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import whoami from "./actions/whoami.ts";
import modelSearch from "./actions/model-search.ts";
import modelGet from "./actions/model-get.ts";
import datasetSearch from "./actions/dataset-search.ts";
import datasetGet from "./actions/dataset-get.ts";
import datasetRows from "./actions/dataset-rows.ts";
import spaceSearch from "./actions/space-search.ts";
import spaceGet from "./actions/space-get.ts";
import repoFiles from "./actions/repo-files.ts";
import fileDownload from "./actions/file-download.ts";
import repoCreate from "./actions/repo-create.ts";
import repoDelete from "./actions/repo-delete.ts";
import chatComplete from "./actions/chat-complete.ts";
import inferenceModelList from "./actions/inference-model-list.ts";

const app: AppDefinition = {
  actions: [
    whoami,
    modelSearch,
    modelGet,
    datasetSearch,
    datasetGet,
    datasetRows,
    spaceSearch,
    spaceGet,
    repoFiles,
    fileDownload,
    repoCreate,
    repoDelete,
    chatComplete,
    inferenceModelList,
  ],
  auth: [token],
  healthChecks: [service, quota],
};

export default app;
