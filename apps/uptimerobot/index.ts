/**
 * UptimeRobot — uptime and status monitoring against the UptimeRobot API v2
 * (`https://api.uptimerobot.com/v2`).
 *
 * Ported from n8n's `nodes-base/nodes/UptimeRobot/` reference node
 * (`UptimeRobot.node.ts`, `MonitorDescription.ts`, `AlertContactDescription.ts`,
 * `GenericFunctions.ts`, `UptimeRobotApi.credentials.ts`) and cross-checked
 * directly against UptimeRobot's own published v2 docs
 * (`uptimerobot.com/api/legacy/`, fetched 2026-08-01).
 *
 * Auth: every request is POST, form-urlencoded, with the API key as an
 * `api_key` body field — never a header, never (with one documented
 * exception not used by this app) a query param. See `auth/api-key.ts` for
 * why that needs a hand-written `sign` hook that edits `request.body`
 * instead of `request.headers`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import accountGet from "./actions/account-get.ts";
import monitorList from "./actions/monitor-list.ts";
import monitorGet from "./actions/monitor-get.ts";
import monitorCreate from "./actions/monitor-create.ts";
import monitorUpdate from "./actions/monitor-update.ts";
import monitorDelete from "./actions/monitor-delete.ts";
import monitorReset from "./actions/monitor-reset.ts";
import alertContactList from "./actions/alert-contact-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // account
    accountGet,
    // monitor
    monitorList,
    monitorGet,
    monitorCreate,
    monitorUpdate,
    monitorDelete,
    monitorReset,
    // alert contact
    alertContactList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
