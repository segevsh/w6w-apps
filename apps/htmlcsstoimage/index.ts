/**
 * HTML/CSS to Image (hcti.io) — render HTML/CSS, web pages and saved templates to images.
 *
 * Built from the vendor's OpenAPI document and docs (2026-10-06). Covered: the three image
 * creation modes, reading/listing/deleting images, the template lifecycle, and usage.
 * Not covered: batch creation, signed create-and-render URLs, the render/store routes,
 * OG configs, proxies, storage destinations and API-key management — see the README.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import imageCreateHtml from "./actions/image-create-html.ts";
import imageCreateUrl from "./actions/image-create-url.ts";
import imageCreateTemplate from "./actions/image-create-template.ts";
import imageGet from "./actions/image-get.ts";
import imageList from "./actions/image-list.ts";
import imageDelete from "./actions/image-delete.ts";
import templateCreate from "./actions/template-create.ts";
import templateVersionCreate from "./actions/template-version-create.ts";
import templateList from "./actions/template-list.ts";
import templateVersionsList from "./actions/template-versions-list.ts";
import templateDelete from "./actions/template-delete.ts";
import usageGet from "./actions/usage-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    imageCreateHtml,
    imageCreateUrl,
    imageCreateTemplate,
    imageGet,
    imageList,
    imageDelete,
    templateCreate,
    templateVersionCreate,
    templateList,
    templateVersionsList,
    templateDelete,
    usageGet,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
