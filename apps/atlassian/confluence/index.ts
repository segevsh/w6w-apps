/**
 * Confluence — read and write Confluence Cloud pages, spaces, blog posts,
 * comments and tasks, against **REST API v2** (`/wiki/api/v2`).
 *
 * Every path, parameter, required body field and response shape was taken from
 * Atlassian's own Confluence Cloud REST API v2 OpenAPI document
 * (https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json,
 * fetched 2026-08-18 — 151 paths), and the two v1 calls from the v1 document
 * alongside it. The connection model, the `*.atlassian.net` / gateway host
 * split and all three health checks follow the `jira` app in this pack,
 * because it is the same Atlassian account, the same site addressing and the
 * same platform-level constraints.
 *
 * **v2 is a different API from v1, not a revision of it.** Different paths,
 * cursor pagination instead of offsets, and numeric IDs where v1 used space
 * keys and content keys. This app is v2 throughout, with exactly two
 * exceptions, each documented on the action that makes it:
 *
 *   - `content-search` — CQL search exists only on v1. v2 publishes no search
 *     endpoint at all, and "find the pages that mention X" is the single most
 *     useful thing a workflow does with a wiki, so dropping it was not an
 *     option.
 *   - `user-current` — v2's only user endpoint is the bulk lookup
 *     `POST /users-bulk`, which resolves account IDs you already have. It
 *     cannot answer "who am I".
 *
 * Deliberately out of scope:
 *   - **Attachment upload and download.** v2 can list and describe attachments
 *     but the file bytes move over multipart upload and a separate download
 *     URL; streaming binary through an action's JSON result is the wrong shape
 *     for it.
 *   - **Label writes.** v2 reads labels but publishes no page-label write
 *     endpoint (it is still a v1 call), so this app reads them and does not
 *     pretend otherwise.
 *   - **Content properties, custom content, whiteboards, databases, folders
 *     and classification levels.** Each is a coherent v2 surface of its own
 *     rather than something to sample here.
 *   - **Space permissions and role assignments.** Administration, not content
 *     automation, and each needs a scope that would widen what every
 *     Connection has to grant.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import pageList from "./actions/page-list.ts";
import pageGet from "./actions/page-get.ts";
import pageCreate from "./actions/page-create.ts";
import pageUpdate from "./actions/page-update.ts";
import pageDelete from "./actions/page-delete.ts";
import pageChildList from "./actions/page-child-list.ts";
import pageAttachmentList from "./actions/page-attachment-list.ts";
import pageLabelList from "./actions/page-label-list.ts";
import attachmentGet from "./actions/attachment-get.ts";
import spaceList from "./actions/space-list.ts";
import spaceGet from "./actions/space-get.ts";
import spaceCreate from "./actions/space-create.ts";
import spacePageList from "./actions/space-page-list.ts";
import blogpostList from "./actions/blogpost-list.ts";
import blogpostGet from "./actions/blogpost-get.ts";
import blogpostCreate from "./actions/blogpost-create.ts";
import pageCommentList from "./actions/page-comment-list.ts";
import commentCreate from "./actions/comment-create.ts";
import commentDelete from "./actions/comment-delete.ts";
import taskList from "./actions/task-list.ts";
import contentSearch from "./actions/content-search.ts";
import userCurrent from "./actions/user-current.ts";

import service from "./health/service.ts";
import site from "./health/site.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // page
    pageList,
    pageGet,
    pageCreate,
    pageUpdate,
    pageDelete,
    pageChildList,
    // attachment
    pageAttachmentList,
    attachmentGet,
    // label
    pageLabelList,
    // space
    spaceList,
    spaceGet,
    spaceCreate,
    spacePageList,
    // blog post
    blogpostList,
    blogpostGet,
    blogpostCreate,
    // comment
    pageCommentList,
    commentCreate,
    commentDelete,
    // task
    taskList,
    // search / user (the two v1 calls)
    contentSearch,
    userCurrent,
  ],
  auth: [apiToken, oauth2],
  healthChecks: [service, site, quota],
} satisfies AppDefinition;
