/**
 * Skyvern — AI browser automation (tasks, agents, runs), over the Skyvern Cloud API
 * (`api.skyvern.com`).
 *
 * Every path, verb, field and error shape here was verified on 2026-10-06 against Skyvern's own
 * OpenAPI document (`https://api.skyvern.com/openapi.json`, version 1.0.0) plus live probes of
 * `api.skyvern.com` and `status.skyvern.com`. See `lib/client.ts` and `README.md`.
 *
 * Covered: running a task or a saved agent, reading / listing / cancelling / retrying runs and
 * pulling their artifacts and timeline, listing and reading agents, persistent browser sessions,
 * browser profiles, and stored credentials (read-only; secrets are never returned).
 *
 * Left out and listed in the README: creating / editing / deleting agents, scripts, schedules,
 * tags, folders, custom LLMs, job recipes, file upload, webhook replay, writing credentials,
 * the SDK `run_action` endpoint and audit export.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import runTask from "./actions/run-task.ts";
import runAgent from "./actions/run-agent.ts";
import runGet from "./actions/run-get.ts";
import runList from "./actions/run-list.ts";
import runCancel from "./actions/run-cancel.ts";
import runRetry from "./actions/run-retry.ts";
import runArtifacts from "./actions/run-artifacts.ts";
import runTimeline from "./actions/run-timeline.ts";

import agentList from "./actions/agent-list.ts";
import agentGet from "./actions/agent-get.ts";

import browserSessionCreate from "./actions/browser-session-create.ts";
import browserSessionList from "./actions/browser-session-list.ts";
import browserSessionGet from "./actions/browser-session-get.ts";
import browserSessionClose from "./actions/browser-session-close.ts";
import browserSessionExtend from "./actions/browser-session-extend.ts";

import browserProfileList from "./actions/browser-profile-list.ts";
import browserProfileGet from "./actions/browser-profile-get.ts";
import browserProfileDelete from "./actions/browser-profile-delete.ts";

import credentialList from "./actions/credential-list.ts";
import credentialGet from "./actions/credential-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    runTask,
    runAgent,
    runGet,
    runList,
    runCancel,
    runRetry,
    runArtifacts,
    runTimeline,
    agentList,
    agentGet,
    browserSessionCreate,
    browserSessionList,
    browserSessionGet,
    browserSessionClose,
    browserSessionExtend,
    browserProfileList,
    browserProfileGet,
    browserProfileDelete,
    credentialList,
    credentialGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
