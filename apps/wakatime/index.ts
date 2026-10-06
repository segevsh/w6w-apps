import type { AppDefinition } from "@w6w/types";
import allTimeGet from "./actions/all-time-get.ts";
import commitGet from "./actions/commit-get.ts";
import commitList from "./actions/commit-list.ts";
import dashboardList from "./actions/dashboard-list.ts";
import dataDumpCreate from "./actions/data-dump-create.ts";
import dataDumpList from "./actions/data-dump-list.ts";
import durationsList from "./actions/durations-list.ts";
import externalDurationCreate from "./actions/external-duration-create.ts";
import externalDurationsBulkDelete from "./actions/external-durations-bulk-delete.ts";
import externalDurationsList from "./actions/external-durations-list.ts";
import goalGet from "./actions/goal-get.ts";
import goalList from "./actions/goal-list.ts";
import heartbeatCreate from "./actions/heartbeat-create.ts";
import heartbeatsBulkCreate from "./actions/heartbeats-bulk-create.ts";
import heartbeatsBulkDelete from "./actions/heartbeats-bulk-delete.ts";
import heartbeatsList from "./actions/heartbeats-list.ts";
import insightGet from "./actions/insight-get.ts";
import leaderboardGet from "./actions/leaderboard-get.ts";
import leaderboardList from "./actions/leaderboard-list.ts";
import orgList from "./actions/org-list.ts";
import projectList from "./actions/project-list.ts";
import statsGet from "./actions/stats-get.ts";
import statusBarGet from "./actions/status-bar-get.ts";
import summariesGet from "./actions/summaries-get.ts";
import userGet from "./actions/user-get.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * WakaTime — automatic coding-time tracking: stats, summaries, durations, heartbeats, projects,
 * commits, goals, leaderboards. Findings that shaped this app (2026-10-06):
 *
 * - The documented host is `api.wakatime.com/api/v1`; the reference's own Python sample uses
 *   `wakatime.com/api/v1`. Only the former is declared.
 * - A missing and a wrong key are both HTTP 401 `{"errors": ["Unauthorized."]}`; the credential
 *   check reads the `data.id` of `GET /users/current`.
 * - Stats-like reads answer 202 while a range is still computing (`is_up_to_date: false`).
 */
const app: AppDefinition = {
  actions: [
    userGet,
    statsGet,
    summariesGet,
    durationsList,
    heartbeatsList,
    heartbeatCreate,
    heartbeatsBulkCreate,
    heartbeatsBulkDelete,
    externalDurationsList,
    externalDurationCreate,
    externalDurationsBulkDelete,
    allTimeGet,
    statusBarGet,
    insightGet,
    projectList,
    commitList,
    commitGet,
    goalList,
    goalGet,
    leaderboardList,
    leaderboardGet,
    orgList,
    dashboardList,
    dataDumpList,
    dataDumpCreate,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
