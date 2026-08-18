/**
 * Checkly — run synthetic monitors, read what they found, and silence them
 * deliberately while you deploy.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI 3.0 document Checkly serves from the API's own host
 * (`https://api.checklyhq.com/openapi.json`, fetched 2026-08-18).
 *
 * ## The account header is half the credential
 *
 * `X-Checkly-Account` is declared on **188 of the document's 194 operations**;
 * the six without it are an inconsistency, not a different kind of endpoint.
 * It is set once in the auth hook, on every request, so no action can be the
 * one that forgets — because a key that can see several accounts and does not
 * say which it means succeeds against the wrong one.
 *
 * ## Four things that go wrong quietly
 *
 *   - **Deactivated and muted are different, and one of them loses history.**
 *     A deactivated check does not run: nothing is watched, and there is no
 *     record of the period afterwards. A muted check runs and records
 *     normally, and only its alerts are suppressed. For a deploy window the
 *     second is almost always what was meant — and a maintenance window is
 *     better still, because it has an end time.
 *   - **`check-run` with no target runs everything.** Checkly's own wording:
 *     *"If no filters are given, matches all eligible checks."* On a large
 *     account that is hundreds of billed runs. This app refuses the ambiguity.
 *     The response is a session, not a verdict — whether anything passed is in
 *     the results afterwards.
 *   - **Failures and errors are not the same event.** A *failure* is the
 *     monitored thing being wrong; an *error* is the check itself not
 *     completing. `check-status-get` returns both, and a workflow that reads
 *     one is blind to the other.
 *   - **Result rows include retry attempts.** Checkly distinguishes `FINAL`
 *     from `ATTEMPT`, so counting every row as an incident overcounts by the
 *     retry strategy. `check-result-list` exposes the filter.
 *
 * ## Neither health check is live, and that is the honest answer
 *
 * Both are declared absences with the measurements behind them: Checkly
 * publishes no machine-readable status (its status page is a single-page app
 * that returns the same HTML for every path, and its old Statuspage instance
 * has been stale since April with a component stuck at partial outage), and it
 * publishes a plan *allowance* but never the consumption. A check that is
 * confidently wrong is worse than no check.
 *
 * Deliberately out of scope:
 *   - **Creating checks.** The eight check types have eight different create
 *     endpoints and eight substantially different bodies, and a browser check's
 *     body is a Playwright script. Authoring monitors belongs in Checkly's
 *     editor or in its CLI's code-as-monitoring workflow; this app runs them,
 *     reads them, and turns them on and off.
 *   - **Checkly's own status pages, incidents and dashboards.** A whole second
 *     product living in the same API — publishing incidents to your customers
 *     is a different job from watching your own checks.
 *   - **Result assets** — screenshots, traces and videos are files behind a
 *     separate endpoint, and an App returns JSON rather than bytes.
 *   - **Private location keys and client certificates** — credential material,
 *     which this app reads around rather than mints.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import checkList from "./actions/check-list.ts";
import checkGet from "./actions/check-get.ts";
import checkToggle from "./actions/check-toggle.ts";
import checkDelete from "./actions/check-delete.ts";
import checkRun from "./actions/check-run.ts";
import checkStatusList from "./actions/check-status-list.ts";
import checkStatusGet from "./actions/check-status-get.ts";
import checkResultList from "./actions/check-result-list.ts";
import checkResultGet from "./actions/check-result-get.ts";
import checkAlertList from "./actions/check-alert-list.ts";
import checkGroupList from "./actions/check-group-list.ts";
import checkGroupGet from "./actions/check-group-get.ts";
import checkGroupChecksList from "./actions/check-group-checks-list.ts";
import maintenanceWindowList from "./actions/maintenance-window-list.ts";
import maintenanceWindowCreate from "./actions/maintenance-window-create.ts";
import maintenanceWindowDelete from "./actions/maintenance-window-delete.ts";
import alertChannelList from "./actions/alert-channel-list.ts";
import alertChannelGet from "./actions/alert-channel-get.ts";
import variableList from "./actions/variable-list.ts";
import variableSet from "./actions/variable-set.ts";
import variableDelete from "./actions/variable-delete.ts";
import locationList from "./actions/location-list.ts";
import runtimeList from "./actions/runtime-list.ts";
import reportingGet from "./actions/reporting-get.ts";
import accountEntitlementsGet from "./actions/account-entitlements-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // checks — what is being watched
    checkList,
    checkGet,
    checkToggle,
    checkDelete,
    checkRun,
    // what they found
    checkStatusList,
    checkStatusGet,
    checkResultList,
    checkResultGet,
    checkAlertList,
    // groups, whose settings override their members'
    checkGroupList,
    checkGroupGet,
    checkGroupChecksList,
    // silencing monitoring on purpose
    maintenanceWindowList,
    maintenanceWindowCreate,
    maintenanceWindowDelete,
    // where alerts go
    alertChannelList,
    alertChannelGet,
    // what checks read
    variableList,
    variableSet,
    variableDelete,
    // the platform around them
    locationList,
    runtimeList,
    reportingGet,
    accountEntitlementsGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
