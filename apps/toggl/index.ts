/**
 * Toggl Track — time tracking against the Toggl Track REST API v9
 * (`https://api.track.toggl.com/api/v9`).
 *
 * n8n ships only a polling trigger for Toggl (`nodes-base/nodes/Toggl/`), no
 * action node, so this app is built directly against Toggl's own published
 * OpenAPI/Swagger spec (engineering.toggl.com/docs/track/openapi) rather than
 * ported from an n8n reference. Every path, verb, and body field below was
 * cross-checked against that spec.
 *
 * Auth: HTTP Basic with the user's API token as the username and the literal
 * string `api_token` as the password — Toggl's own spec states this exactly
 * (`base64(user_name:api_token)`), not a bearer token and not the token as a
 * password.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import timeEntryStart from "./actions/time-entry-start.ts";
import timeEntryStop from "./actions/time-entry-stop.ts";
import timeEntryGetCurrent from "./actions/time-entry-get-current.ts";
import timeEntryGetMany from "./actions/time-entry-get-many.ts";
import timeEntryUpdate from "./actions/time-entry-update.ts";
import timeEntryDelete from "./actions/time-entry-delete.ts";
import projectGetMany from "./actions/project-get-many.ts";
import projectCreate from "./actions/project-create.ts";
import workspaceGetMany from "./actions/workspace-get-many.ts";
import clientGetMany from "./actions/client-get-many.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // time entry
    timeEntryStart,
    timeEntryStop,
    timeEntryGetCurrent,
    timeEntryGetMany,
    timeEntryUpdate,
    timeEntryDelete,
    // project
    projectGetMany,
    projectCreate,
    // workspace
    workspaceGetMany,
    // client
    clientGetMany,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
