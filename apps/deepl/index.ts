import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import translateText from "./actions/translate-text.ts";
import translateDocument from "./actions/translate-document.ts";
import documentStatus from "./actions/document-status.ts";
import documentDownload from "./actions/document-download.ts";
import getUsage from "./actions/get-usage.ts";
import listLanguages from "./actions/list-languages.ts";
import glossaryList from "./actions/glossary-list.ts";
import glossaryGet from "./actions/glossary-get.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    translateText,
    translateDocument,
    documentStatus,
    documentDownload,
    getUsage,
    listLanguages,
    glossaryList,
    glossaryGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
