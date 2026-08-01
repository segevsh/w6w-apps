import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import createImage from "./actions/create-image.ts";
import createPdf from "./actions/create-pdf.ts";
import listTemplates from "./actions/list-templates.ts";
import getTemplate from "./actions/get-template.ts";
import listObjects from "./actions/list-objects.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    createImage,
    createPdf,
    listTemplates,
    getTemplate,
    listObjects,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
