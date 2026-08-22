/**
 * Gerrit — search and review changes, vote on labels, submit or abandon, and
 * inspect projects.
 *
 * Two things about this API shape every line of the client. **Every JSON
 * response begins with `)]}'`** — an XSSI guard that makes `JSON.parse` fail
 * on every single call until it is stripped. And **timestamps are not ISO
 * 8601**: `"2026-08-19 04:13:33.000000000"`, with no timezone and UTC by
 * convention, so `Date.parse` reads them as local time and every age
 * calculation is wrong by the runtime's offset.
 *
 * Everything here uses the `/a/` path, because Gerrit serves anonymous reads
 * at the bare one — a broken credential would otherwise return less rather
 * than fail. The single exception is `health/instance.ts`, which wants exactly
 * that behaviour. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import httpPassword from "./auth/http-password.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";

import changeSearch from "./actions/change-search.ts";
import changeGet from "./actions/change-get.ts";
import changeReview from "./actions/change-review.ts";
import changeSubmit from "./actions/change-submit.ts";
import changeAbandon from "./actions/change-abandon.ts";
import changeReviewerAdd from "./actions/change-reviewer-add.ts";
import changeCommentsList from "./actions/change-comments-list.ts";
import changeFilesList from "./actions/change-files-list.ts";
import projectList from "./actions/project-list.ts";
import accountSearch from "./actions/account-search.ts";
import serverInfoGet from "./actions/server-info-get.ts";

const app: AppDefinition = {
  actions: [
    changeSearch,
    changeGet,
    changeReview,
    changeSubmit,
    changeAbandon,
    changeReviewerAdd,
    changeCommentsList,
    changeFilesList,
    projectList,
    accountSearch,
    serverInfoGet,
  ],
  auth: [httpPassword],
  healthChecks: [service, instance],
};

export default app;
