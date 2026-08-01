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
  healthChecks: [service, quota],
} satisfies AppDefinition;
