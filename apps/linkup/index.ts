import type { AppDefinition } from "@w6w/types";
import search from "./actions/search.ts";
import searchResults from "./actions/search-results.ts";
import searchAnswer from "./actions/search-answer.ts";
import searchStructured from "./actions/search-structured.ts";
import fetchPage from "./actions/fetch.ts";
import creditsBalance from "./actions/credits-balance.ts";
import extractCreate from "./actions/extract-create.ts";
import extractList from "./actions/extract-list.ts";
import extractGet from "./actions/extract-get.ts";
import tasksCreate from "./actions/tasks-create.ts";
import tasksList from "./actions/tasks-list.ts";
import tasksGet from "./actions/tasks-get.ts";
import researchCreate from "./actions/research-create.ts";
import researchList from "./actions/research-list.ts";
import researchGet from "./actions/research-get.ts";
import rewindSearch from "./actions/rewind-search.ts";
import rewindFetch from "./actions/rewind-fetch.ts";
import createResponse from "./actions/create-response.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Linkup — AI web search and fetch API (linkup.so; not "LinkupAPI", a different LinkedIn
 * product). Findings that shaped this app (2026-10-06):
 *
 * - Auth is a plain Bearer key, applied in `sign`. Without a key `/search` and `/fetch` answer
 *   402 (x402 pay-per-request details), every other route 401, so the probe is the free
 *   `/v1/credits/balance`, which answers the same 401 for a missing and a bogus key.
 * - `/search` has four depths and three output types whose response shapes differ (and a
 *   fourth when `includeSources` is set on structured output), so the app returns one
 *   normalised object and offers per-output-type variants.
 * - `structuredOutputSchema` on `/search` and `/research` is a JSON Schema serialised AS A
 *   STRING; `schema` on `/fetch` and `/extract` is a JSON object.
 * - Research, extract and tasks are asynchronous: they answer an id to poll.
 */
const app: AppDefinition = {
  actions: [
    search,
    searchResults,
    searchAnswer,
    searchStructured,
    fetchPage,
    creditsBalance,
    extractCreate,
    extractList,
    extractGet,
    tasksCreate,
    tasksList,
    tasksGet,
    researchCreate,
    researchList,
    researchGet,
    rewindSearch,
    rewindFetch,
    createResponse,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
