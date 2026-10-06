/**
 * WebScraping.AI — page HTML/text, CSS-selector extraction, LLM question and field extraction,
 * Google SERP and structured site data over the REST API at `api.webscraping.ai`. See `README.md`
 * and `lib/client.ts` for what was verified.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import aiQuestion from "./actions/ai-question.ts";
import aiFields from "./actions/ai-fields.ts";
import htmlGet from "./actions/html-get.ts";
import textGet from "./actions/text-get.ts";
import selectedGet from "./actions/selected-get.ts";
import selectedMultipleGet from "./actions/selected-multiple-get.ts";
import serpSearch from "./actions/serp-search.ts";
import dataGet from "./actions/data-get.ts";
import accountGet from "./actions/account-get.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    aiQuestion,
    aiFields,
    htmlGet,
    textGet,
    selectedGet,
    selectedMultipleGet,
    serpSearch,
    dataGet,
    accountGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
