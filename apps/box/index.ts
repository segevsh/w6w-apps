import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import listFolderItems from "./actions/list-folder-items.ts";
import getFile from "./actions/get-file.ts";
import getFolder from "./actions/get-folder.ts";
import createFolder from "./actions/create-folder.ts";
import uploadFile from "./actions/upload-file.ts";
import downloadFile from "./actions/download-file.ts";
import deleteFile from "./actions/delete-file.ts";
import deleteFolder from "./actions/delete-folder.ts";
import search from "./actions/search.ts";
import createSharedLink from "./actions/create-shared-link.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import fileUploaded from "./triggers/file-uploaded.ts";
import activity from "./triggers/activity.ts";
import fileTrashed from "./triggers/file-trashed.ts";
import fileDeleted from "./triggers/file-deleted.ts";
import fileRestored from "./triggers/file-restored.ts";
import fileMoved from "./triggers/file-moved.ts";
import fileCopied from "./triggers/file-copied.ts";
import fileRenamed from "./triggers/file-renamed.ts";
import folderCreated from "./triggers/folder-created.ts";
import folderRenamed from "./triggers/folder-renamed.ts";
import folderMoved from "./triggers/folder-moved.ts";
import folderCopied from "./triggers/folder-copied.ts";
import folderTrashed from "./triggers/folder-trashed.ts";
import folderDeleted from "./triggers/folder-deleted.ts";
import folderRestored from "./triggers/folder-restored.ts";
import sharedLinkCreated from "./triggers/shared-link-created.ts";
import sharedLinkUpdated from "./triggers/shared-link-updated.ts";
import sharedLinkDeleted from "./triggers/shared-link-deleted.ts";
import newFolderItem from "./triggers/new-folder-item.ts";
import newOrUpdatedSearchResult from "./triggers/new-or-updated-search-result.ts";

export default {
  actions: [
    listFolderItems,
    getFile,
    getFolder,
    createFolder,
    uploadFile,
    downloadFile,
    deleteFile,
    deleteFolder,
    search,
    createSharedLink,
  ],
  auth: [oauth2],
  triggers: [
    fileUploaded,
    fileTrashed,
    fileDeleted,
    fileRestored,
    fileMoved,
    fileCopied,
    fileRenamed,
    folderCreated,
    folderRenamed,
    folderMoved,
    folderCopied,
    folderTrashed,
    folderDeleted,
    folderRestored,
    sharedLinkCreated,
    sharedLinkUpdated,
    sharedLinkDeleted,
    newFolderItem,
    newOrUpdatedSearchResult,
    activity,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
