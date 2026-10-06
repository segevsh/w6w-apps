/**
 * Egnyte — content collaboration and file storage, over the Public API.
 *
 * Covers the file system (browse, create, move, copy, delete, upload, download,
 * lock), shareable links, search and users.
 *
 * Every customer has its own host (`acme.egnyte.com`). The manifest cannot
 * enumerate those, so `w6w.network.allow` declares `*.egnyte.com`; the domain is
 * collected on the Connection and recorded by `afterConnect` (same model as the
 * Freshdesk app).
 *
 * Deliberately absent: the OAuth authorization dance (this app takes a token),
 * chunked upload for files over 100 MB, permissions/groups/metadata/audit
 * admin APIs, and webhooks/events (a Trigger surface, not an Action).
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import itemGet from "./actions/item-get.ts";
import itemGetById from "./actions/item-get-by-id.ts";
import folderCreate from "./actions/folder-create.ts";
import itemMove from "./actions/item-move.ts";
import itemCopy from "./actions/item-copy.ts";
import itemDelete from "./actions/item-delete.ts";
import fileUpload from "./actions/file-upload.ts";
import fileDownload from "./actions/file-download.ts";
import folderStats from "./actions/folder-stats.ts";
import fileLock from "./actions/file-lock.ts";
import fileUnlock from "./actions/file-unlock.ts";
import linkCreate from "./actions/link-create.ts";
import linkList from "./actions/link-list.ts";
import linkGet from "./actions/link-get.ts";
import linkDelete from "./actions/link-delete.ts";
import search from "./actions/search.ts";
import userMe from "./actions/user-me.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";

import service from "./health/service.ts";
import domain from "./health/domain.ts";

export default {
  actions: [
    itemGet,
    itemGetById,
    folderCreate,
    itemMove,
    itemCopy,
    itemDelete,
    fileUpload,
    fileDownload,
    folderStats,
    fileLock,
    fileUnlock,
    linkCreate,
    linkList,
    linkGet,
    linkDelete,
    search,
    userMe,
    userList,
    userGet,
  ],
  auth: [accessToken],
  healthChecks: [service, domain],
} satisfies AppDefinition;
