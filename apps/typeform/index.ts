/**
 * Typeform — w6w port of n8n's `Typeform` nodes.
 *
 * Typeform splits its platform across a handful of REST APIs that all live under
 * `api.typeform.com`: the Create API (forms, workspaces, themes, images) and the
 * Responses API (`/forms/{id}/responses`). This app covers the read/write surface
 * of forms plus the read surface of responses, workspaces, themes and images.
 *
 * Deliberately absent: the form-submission webhook (a Trigger, not an Action —
 * which is why n8n's webhook secret handling is not modeled here).
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import formCreate from "./actions/form-create.ts";
import formGet from "./actions/form-get.ts";
import formGetMany from "./actions/form-get-many.ts";
import formUpdate from "./actions/form-update.ts";
import formDelete from "./actions/form-delete.ts";
import responseGetMany from "./actions/response-get-many.ts";
import responseDelete from "./actions/response-delete.ts";
import workspaceGetMany from "./actions/workspace-get-many.ts";
import themeGetMany from "./actions/theme-get-many.ts";
import imageGetMany from "./actions/image-get-many.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // form
    formCreate,
    formGet,
    formGetMany,
    formUpdate,
    formDelete,
    // response
    responseGetMany,
    responseDelete,
    // workspace / theme / image — the hrefs the write actions reference
    workspaceGetMany,
    themeGetMany,
    imageGetMany,
  ],
  auth: [personalAccessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
