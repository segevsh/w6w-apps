/**
 * Placid: generate images, PDFs and videos from templates, over the REST API v2.0
 * (`api.placid.app/api/rest`). Verified 2026-10-06 against the reference linked from
 * https://placid.app/docs. See `lib/client.ts` for hosts, auth, limits and errors.
 *
 * Not covered, deliberately: the URL API (token-in-URL image URLs, a different surface), the
 * Editor SDK, the WordPress plugin API and the MCP server, none of which is REST; and
 * multi-file media upload (this app uploads one file per call).
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import imageCreate from "./actions/image-create.ts";
import imageGet from "./actions/image-get.ts";
import imageDelete from "./actions/image-delete.ts";
import pdfCreate from "./actions/pdf-create.ts";
import pdfMerge from "./actions/pdf-merge.ts";
import pdfGet from "./actions/pdf-get.ts";
import pdfDelete from "./actions/pdf-delete.ts";
import videoCreate from "./actions/video-create.ts";
import videoGet from "./actions/video-get.ts";
import videoDelete from "./actions/video-delete.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateCreate from "./actions/template-create.ts";
import templateUpdate from "./actions/template-update.ts";
import templateDelete from "./actions/template-delete.ts";
import collectionList from "./actions/collection-list.ts";
import collectionGet from "./actions/collection-get.ts";
import collectionCreate from "./actions/collection-create.ts";
import collectionUpdate from "./actions/collection-update.ts";
import collectionDelete from "./actions/collection-delete.ts";
import fontList from "./actions/font-list.ts";
import fontGet from "./actions/font-get.ts";
import fontUpload from "./actions/font-upload.ts";
import fontUpdate from "./actions/font-update.ts";
import fontDelete from "./actions/font-delete.ts";
import mediaUpload from "./actions/media-upload.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    imageCreate,
    imageGet,
    imageDelete,
    pdfCreate,
    pdfMerge,
    pdfGet,
    pdfDelete,
    videoCreate,
    videoGet,
    videoDelete,
    templateList,
    templateGet,
    templateCreate,
    templateUpdate,
    templateDelete,
    collectionList,
    collectionGet,
    collectionCreate,
    collectionUpdate,
    collectionDelete,
    fontList,
    fontGet,
    fontUpload,
    fontUpdate,
    fontDelete,
    mediaUpload,
  ],
  auth: [bearerToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
