/**
 * Mural — the public REST API (`app.mural.co/api/public/v1`): workspaces, rooms,
 * murals, widgets (sticky notes, text boxes, comments) and tags.
 *
 * Every path, verb, parameter and body field was read on 2026-10-06 from Mural's
 * own API reference (the OpenAPI 3.1 document embedded in each page under
 * `developers.mural.co/public/reference/`). Findings that shaped the design:
 *
 *  1. **OAuth 2.0 authorization code only.** The spec declares one security
 *     scheme, `oauth2`; there is no API key. Tokens expire (`TOKEN_EXPIRED`),
 *     so the host's refresh flow is required.
 *  2. **Every response is wrapped** in `{ value }` (lists add `next`, an opaque
 *     page token that expires). Actions unwrap it.
 *  3. **Widget creates take and return arrays** (`POST .../widgets/sticky-note`
 *     body is `[{...}]`); the create actions send one and return the first.
 *  4. **Room IDs are integers, mural and workspace IDs are strings.**
 *  5. Errors are `{code, message}`; the status code is only a hint.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import currentUserGet from "./actions/current-user-get.ts";
import workspaceList from "./actions/workspace-list.ts";
import workspaceGet from "./actions/workspace-get.ts";
import roomList from "./actions/room-list.ts";
import roomGet from "./actions/room-get.ts";
import roomCreate from "./actions/room-create.ts";
import roomUpdate from "./actions/room-update.ts";
import roomDelete from "./actions/room-delete.ts";
import roomSearch from "./actions/room-search.ts";
import roomMemberList from "./actions/room-member-list.ts";
import roomFolderList from "./actions/room-folder-list.ts";
import muralList from "./actions/mural-list.ts";
import muralRecentList from "./actions/mural-recent-list.ts";
import roomMuralList from "./actions/room-mural-list.ts";
import muralGet from "./actions/mural-get.ts";
import muralCreate from "./actions/mural-create.ts";
import muralUpdate from "./actions/mural-update.ts";
import muralDelete from "./actions/mural-delete.ts";
import muralDuplicate from "./actions/mural-duplicate.ts";
import muralSearch from "./actions/mural-search.ts";
import muralUserList from "./actions/mural-user-list.ts";
import widgetList from "./actions/widget-list.ts";
import widgetGet from "./actions/widget-get.ts";
import widgetDelete from "./actions/widget-delete.ts";
import stickyNoteCreate from "./actions/sticky-note-create.ts";
import stickyNoteUpdate from "./actions/sticky-note-update.ts";
import textboxCreate from "./actions/textbox-create.ts";
import commentCreate from "./actions/comment-create.ts";
import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    currentUserGet,
    workspaceList,
    workspaceGet,
    roomList,
    roomGet,
    roomCreate,
    roomUpdate,
    roomDelete,
    roomSearch,
    roomMemberList,
    roomFolderList,
    muralList,
    muralRecentList,
    roomMuralList,
    muralGet,
    muralCreate,
    muralUpdate,
    muralDelete,
    muralDuplicate,
    muralSearch,
    muralUserList,
    widgetList,
    widgetGet,
    widgetDelete,
    stickyNoteCreate,
    stickyNoteUpdate,
    textboxCreate,
    commentCreate,
    tagList,
    tagCreate,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
