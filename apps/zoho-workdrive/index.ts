/**
 * Zoho WorkDrive — files, folders, team folders, search and external links over the WorkDrive
 * REST API (`https://www.zohoapis.<tld>/workdrive/api/v1/...`, JSON:API payloads).
 *
 * Every endpoint, parameter and response shape was read from the vendor reference
 * (`https://www.zoho.com/workdrive/developer/docs/api/v1/`, the pages its sitemap lists) on
 * 2026-10-06. Findings that shaped the design:
 *
 *  1. **JSON:API on the wire** (`lib/client.ts`): bodies are `{data:{type,attributes}}` as
 *     `application/vnd.api+json`; responses carry `data` / `links` / `meta`.
 *  2. **Nine data centres** (`lib/regions.ts`), one OAuth method each (`auth/oauth2.ts`).
 *  3. **One PATCH, six jobs**: rename, move, trash (`status` 51), restore (1), delete
 *     permanently (61) and favorite all `PATCH /files/{id}` with different attributes.
 *  4. **Errors are classified by the vendor's `errors[].id`**, not the HTTP status: a request
 *     with no token at all answers `500 INVALID_TICKET`.
 *  5. **No quota surface** (`health/quota.ts`) — declared absent.
 *
 * Deliberately absent: chunked large-file upload (> 250 MB), binary download (a separate
 * `download.zoho.com` host), workflows, data templates/custom fields, collections, comments,
 * groups, labels, sharing to members, and team administration — see the README.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import fileCopy from "./actions/file-copy.ts";
import fileDeletePermanent from "./actions/file-delete-permanent.ts";
import fileFavoriteSet from "./actions/file-favorite-set.ts";
import fileGet from "./actions/file-get.ts";
import fileList from "./actions/file-list.ts";
import fileMove from "./actions/file-move.ts";
import fileRename from "./actions/file-rename.ts";
import fileRestore from "./actions/file-restore.ts";
import fileTrash from "./actions/file-trash.ts";
import fileUpload from "./actions/file-upload.ts";
import fileVersionList from "./actions/file-version-list.ts";
import folderCreate from "./actions/folder-create.ts";
import recordSearch from "./actions/record-search.ts";
import shareLinkCreate from "./actions/share-link-create.ts";
import shareLinkList from "./actions/share-link-list.ts";
import shareLinkRevoke from "./actions/share-link-revoke.ts";
import teamFolderCreate from "./actions/team-folder-create.ts";
import teamFolderFileList from "./actions/team-folder-file-list.ts";
import teamFolderGet from "./actions/team-folder-get.ts";
import teamFolderList from "./actions/team-folder-list.ts";
import teamGet from "./actions/team-get.ts";
import teamList from "./actions/team-list.ts";
import teamMemberList from "./actions/team-member-list.ts";
import userGet from "./actions/user-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // user
    userGet,
    // teams
    teamList,
    teamGet,
    teamMemberList,
    // team folders
    teamFolderList,
    teamFolderGet,
    teamFolderCreate,
    teamFolderFileList,
    // files and folders
    fileGet,
    fileList,
    folderCreate,
    fileRename,
    fileMove,
    fileCopy,
    fileTrash,
    fileRestore,
    fileDeletePermanent,
    fileFavoriteSet,
    fileVersionList,
    fileUpload,
    // search
    recordSearch,
    // external links
    shareLinkCreate,
    shareLinkList,
    shareLinkRevoke,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
