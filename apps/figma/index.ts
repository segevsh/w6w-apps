import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import getFile from "./actions/get-file.ts";
import getFileNodes from "./actions/get-file-nodes.ts";
import getFileVersions from "./actions/get-file-versions.ts";
import getImages from "./actions/get-images.ts";
import listComments from "./actions/list-comments.ts";
import postComment from "./actions/post-comment.ts";
import deleteComment from "./actions/delete-comment.ts";
import getTeamProjects from "./actions/get-team-projects.ts";
import getProjectFiles from "./actions/get-project-files.ts";
import getCurrentUser from "./actions/get-current-user.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // file
    getFile,
    getFileNodes,
    getFileVersions,
    // image
    getImages,
    // comment
    listComments,
    postComment,
    deleteComment,
    // project
    getTeamProjects,
    getProjectFiles,
    // user
    getCurrentUser,
  ],
  auth: [personalAccessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
