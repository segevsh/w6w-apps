/**
 * Document360 — knowledge-base platform: projects, workspaces, categories, articles, Drive,
 * team accounts and readers, over the **v3 Customer API** (`apihub.document360.io` and its US and
 * Canada siblings).
 *
 * Every path, verb, query parameter and body field in this app was verified on 2026-10-06 against
 * Document360's own OpenAPI 3.0.1 document (`apihub.document360.io/swagger/v3/swagger.json`,
 * 4,544,745 bytes, 149 paths) and the v3 reference at `apidocs.document360.com/apidocs`. v1 and v2
 * (an `api_token` header) are older generations and are not used.
 *
 * Findings that shaped the design, documented in full where they matter:
 *
 *  1. **v3 authenticates with `X-API-Key`, not `api_token`** (`auth/api-key.ts`). A v1/v2 token
 *     does not work, and `Authorization: Bearer` is reserved for OAuth access tokens.
 *  2. **The host depends on the project's data center** (`lib/client.ts`): Europe, United States
 *     or Canada, a Connection field. Only those three fixed hosts are in `network.allow`.
 *  3. **The gateway 401 has an empty body** (`auth/api-key.ts`, `health/api.ts`): a missing key and
 *     a wrong key cannot be told apart, so a 401 is classified by status, while every other
 *     failure is classified by the problem+json `errors[].code` (a `403` can mean "role", "plan",
 *     "premium add-on" or "seats", and only the code says which).
 *  4. **Every path is project-scoped** (`/v3/projects/{project_id}/…`). The project id is a
 *     Connection default, overridable per action, and filled in automatically when the key sees
 *     exactly one project.
 *  5. **List defaults and limits**: `page_size` defaults to 25 and caps at 100; the workspace
 *     category and article lists page in memory server-side.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import workspaceList from "./actions/workspace-list.ts";
import workspaceGet from "./actions/workspace-get.ts";
import workspaceCategoryList from "./actions/workspace-category-list.ts";
import workspaceArticleList from "./actions/workspace-article-list.ts";
import workspaceSearch from "./actions/workspace-search.ts";
import documentGetByUrl from "./actions/document-get-by-url.ts";
import articleGet from "./actions/article-get.ts";
import articleCreate from "./actions/article-create.ts";
import articleUpdate from "./actions/article-update.ts";
import articleDelete from "./actions/article-delete.ts";
import articlePublish from "./actions/article-publish.ts";
import articleUnpublish from "./actions/article-unpublish.ts";
import articleFork from "./actions/article-fork.ts";
import articleArchive from "./actions/article-archive.ts";
import articleUnarchive from "./actions/article-unarchive.ts";
import articleVersionList from "./actions/article-version-list.ts";
import articleSettingsGet from "./actions/article-settings-get.ts";
import categoryGet from "./actions/category-get.ts";
import categoryCreate from "./actions/category-create.ts";
import categoryUpdate from "./actions/category-update.ts";
import categoryDelete from "./actions/category-delete.ts";
import categoryPublish from "./actions/category-publish.ts";
import driveFolderList from "./actions/drive-folder-list.ts";
import driveFolderGet from "./actions/drive-folder-get.ts";
import driveFolderCreate from "./actions/drive-folder-create.ts";
import driveFileGet from "./actions/drive-file-get.ts";
import driveSearch from "./actions/drive-search.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userGroupList from "./actions/user-group-list.ts";
import readerList from "./actions/reader-list.ts";
import languageList from "./actions/language-list.ts";
import tagList from "./actions/tag-list.ts";
import labelList from "./actions/label-list.ts";
import workflowStatusList from "./actions/workflow-status-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    projectList,
    projectGet,
    workspaceList,
    workspaceGet,
    workspaceCategoryList,
    workspaceArticleList,
    workspaceSearch,
    documentGetByUrl,
    articleGet,
    articleCreate,
    articleUpdate,
    articleDelete,
    articlePublish,
    articleUnpublish,
    articleFork,
    articleArchive,
    articleUnarchive,
    articleVersionList,
    articleSettingsGet,
    categoryGet,
    categoryCreate,
    categoryUpdate,
    categoryDelete,
    categoryPublish,
    driveFolderList,
    driveFolderGet,
    driveFolderCreate,
    driveFileGet,
    driveSearch,
    userList,
    userGet,
    userGroupList,
    readerList,
    languageList,
    tagList,
    labelList,
    workflowStatusList,
  ],
  // v3 API key only. Document360's OAuth 2.0 bearer path is for the interactive reference and for
  // acting on behalf of a person; an API key is the integration credential.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
