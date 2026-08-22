/**
 * Vercel — ship and inspect deployments, and manage the projects, aliases,
 * environment variables and domains around them, against Vercel's REST API
 * (`https://api.vercel.com`).
 *
 * Every path, parameter, required body field and response shape in this app
 * was taken from Vercel's own OpenAPI document (https://openapi.vercel.sh/,
 * fetched 2026-08-18 — 279 paths) and confirmed against Vercel's REST API
 * docs for the two conventions the schema does not spell out: the
 * `Authorization: Bearer` header, and `teamId` as the query param that scopes
 * a request to a Team.
 *
 * **Paths carry their own version.** Vercel versions per endpoint, not per
 * API — `/v7/deployments` lists them, `/v13/deployments/{id}` reads one,
 * `/v9/projects/{idOrName}` reads a project and `/v10/projects` lists them.
 * Each action states the full versioned path exactly as the schema lists it,
 * rather than assuming a base version that does not exist.
 *
 * Deliberately out of scope:
 *   - **File-upload deployments.** `POST /v13/deployments` also accepts an
 *     inline `files` array, but that path means uploading every file of the
 *     build through Vercel's files API first — an SDK/CLI job. The Git-source
 *     arm is what a workflow needs and is what `deployment-create` exposes.
 *   - **Log streaming.** `GET /v3/deployments/{id}/events?follow=1` holds the
 *     connection open for the life of a build. An action runs to completion,
 *     so the flag is not exposed; the same endpoint without it returns the
 *     build log as data.
 *   - **DNS record management** (`/v2/domains/{domain}/records` and friends),
 *     **domain registration** (the 17 `/v1/registrar/*` endpoints), **Edge
 *     Config, Feature Flags, Access Groups, Artifacts and Marketplace
 *     integrations.** Each is a coherent surface of its own that deserves its
 *     own action set rather than a token endpoint here.
 *   - **Team and member administration** (`POST /v1/teams`,
 *     `PATCH /v2/teams/{id}`, the member endpoints). Account administration,
 *     not deploy automation; `team-list` is here only because it is how you
 *     find the `teamId` the other actions take.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import deploymentList from "./actions/deployment-list.ts";
import deploymentGet from "./actions/deployment-get.ts";
import deploymentCreate from "./actions/deployment-create.ts";
import deploymentCancel from "./actions/deployment-cancel.ts";
import deploymentDelete from "./actions/deployment-delete.ts";
import deploymentEventList from "./actions/deployment-event-list.ts";
import deploymentPromote from "./actions/deployment-promote.ts";
import deploymentRollback from "./actions/deployment-rollback.ts";
import runtimeLogList from "./actions/runtime-log-list.ts";
import aliasList from "./actions/alias-list.ts";
import aliasGet from "./actions/alias-get.ts";
import aliasAssign from "./actions/alias-assign.ts";
import aliasDelete from "./actions/alias-delete.ts";
import deploymentAliasList from "./actions/deployment-alias-list.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDelete from "./actions/project-delete.ts";
import envList from "./actions/env-list.ts";
import envCreate from "./actions/env-create.ts";
import envUpdate from "./actions/env-update.ts";
import envDelete from "./actions/env-delete.ts";
import domainList from "./actions/domain-list.ts";
import projectDomainList from "./actions/project-domain-list.ts";
import projectDomainAdd from "./actions/project-domain-add.ts";
import teamList from "./actions/team-list.ts";
import userGet from "./actions/user-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // deployment
    deploymentList,
    deploymentGet,
    deploymentCreate,
    deploymentCancel,
    deploymentDelete,
    deploymentEventList,
    deploymentPromote,
    deploymentRollback,
    runtimeLogList,
    // alias
    aliasList,
    aliasGet,
    aliasAssign,
    aliasDelete,
    deploymentAliasList,
    // project
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectDelete,
    // environment variable
    envList,
    envCreate,
    envUpdate,
    envDelete,
    // domain
    domainList,
    projectDomainList,
    projectDomainAdd,
    // team / user
    teamList,
    userGet,
  ],
  auth: [accessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
