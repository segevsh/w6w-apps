/**
 * Float — resource scheduling and team capacity planning
 * (`api.float.com/v3`).
 *
 * Every path, verb, parameter and response shape in this app was verified on
 * 2026-09-15 against Float's own Swagger 2.0 document
 * (`developer.float.com/swagger-api-v3.yaml`, `info.version` `3.0.0`, plus
 * its `paths/*.yaml` includes) and live probes against `api.float.com` and
 * `status.float.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The findings that shaped this app, each documented in full where they
 * matter:
 *
 *  1. **A missing `Authorization` header never reaches Float's own API.** An
 *     edge/WAF layer in front of Kong answers with a bare `403 Forbidden`
 *     (`text/html`, no JSON) regardless of `User-Agent`; the instant any
 *     `Authorization: Bearer …` value is present, even garbage, the request
 *     reaches Float's real gateway and gets Float's JSON error shape. See
 *     `lib/client.ts` and `auth/api-token.ts`.
 *  2. **`logged-time` create answers `200` with an ARRAY**, and its own id
 *     (`logged_time_id`) is a STRING — every other Float create answers
 *     `201` with one object, and every other Float id is an integer. See
 *     `actions/logged-time-create.ts`.
 *  3. **`status` create/update answer `{"status": [...]}`**, because
 *     creating a status that overlaps an existing one for that person
 *     silently deletes the old one and returns both. See
 *     `actions/status-create.ts`.
 *  4. **Float asks every integration to send a `User-Agent`** identifying
 *     the app plus a contact email. Not enforced by the edge, but it is the
 *     vendor's own explicit request and costs nothing to honour — see
 *     `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import personList from "./actions/person-list.ts";
import personGet from "./actions/person-get.ts";
import personCreate from "./actions/person-create.ts";
import personUpdate from "./actions/person-update.ts";
import personDelete from "./actions/person-delete.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDelete from "./actions/project-delete.ts";

import clientList from "./actions/client-list.ts";
import clientGet from "./actions/client-get.ts";
import clientCreate from "./actions/client-create.ts";
import clientUpdate from "./actions/client-update.ts";
import clientDelete from "./actions/client-delete.ts";

import milestoneList from "./actions/milestone-list.ts";
import milestoneGet from "./actions/milestone-get.ts";
import milestoneCreate from "./actions/milestone-create.ts";
import milestoneUpdate from "./actions/milestone-update.ts";
import milestoneDelete from "./actions/milestone-delete.ts";

import timeoffList from "./actions/timeoff-list.ts";
import timeoffGet from "./actions/timeoff-get.ts";
import timeoffCreate from "./actions/timeoff-create.ts";
import timeoffUpdate from "./actions/timeoff-update.ts";
import timeoffDelete from "./actions/timeoff-delete.ts";

import allocationList from "./actions/allocation-list.ts";
import allocationGet from "./actions/allocation-get.ts";
import allocationCreate from "./actions/allocation-create.ts";
import allocationUpdate from "./actions/allocation-update.ts";
import allocationDelete from "./actions/allocation-delete.ts";

import statusList from "./actions/status-list.ts";
import statusGet from "./actions/status-get.ts";
import statusCreate from "./actions/status-create.ts";
import statusUpdate from "./actions/status-update.ts";
import statusDelete from "./actions/status-delete.ts";

import loggedTimeList from "./actions/logged-time-list.ts";
import loggedTimeGet from "./actions/logged-time-get.ts";
import loggedTimeCreate from "./actions/logged-time-create.ts";
import loggedTimeUpdate from "./actions/logged-time-update.ts";
import loggedTimeDelete from "./actions/logged-time-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // People
    personList,
    personGet,
    personCreate,
    personUpdate,
    personDelete,
    // Projects
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectDelete,
    // Clients
    clientList,
    clientGet,
    clientCreate,
    clientUpdate,
    clientDelete,
    // Milestones
    milestoneList,
    milestoneGet,
    milestoneCreate,
    milestoneUpdate,
    milestoneDelete,
    // Time off
    timeoffList,
    timeoffGet,
    timeoffCreate,
    timeoffUpdate,
    timeoffDelete,
    // Allocations (the API's own "tasks")
    allocationList,
    allocationGet,
    allocationCreate,
    allocationUpdate,
    allocationDelete,
    // Statuses
    statusList,
    statusGet,
    statusCreate,
    statusUpdate,
    statusDelete,
    // Logged time
    loggedTimeList,
    loggedTimeGet,
    loggedTimeCreate,
    loggedTimeUpdate,
    loggedTimeDelete,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
