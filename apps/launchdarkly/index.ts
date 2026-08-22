/**
 * LaunchDarkly — read and change feature flags, the segments they target, and
 * the audit trail behind both.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI 3.0.3 document LaunchDarkly serves from the API's own host
 * (`https://app.launchdarkly.com/api/v2/openapi.json`, 250 paths, fetched
 * 2026-08-18), and the auth behaviour was measured against the same host.
 *
 * ## Two things about the credential
 *
 * **The token is the whole `Authorization` header.** LaunchDarkly's security
 * scheme is `type: apiKey, in: header, name: Authorization` — not `Bearer
 * <token>`, not `token <token>`. That is unusual enough to be the first thing
 * to check when a valid-looking key is rejected.
 *
 * **There are two instances.** `app.launchdarkly.com` is commercial;
 * `app.launchdarkly.us` is LaunchDarkly's US-government (FedRAMP) service. An
 * account lives in one, a key from one is unknown to the other, so the
 * instance is a connection field and `test` probes the chosen one.
 *
 * ## Semantic patch, and the content type that selects it
 *
 * This is the detail everything else rests on. LaunchDarkly's `PATCH`
 * endpoints accept three formats, distinguished **by the `Content-Type`
 * alone**:
 *
 *   - `application/json` → JSON Patch (RFC 6902), a diff against the flag's
 *     internal shape;
 *   - `application/merge-patch+json` → JSON merge patch;
 *   - `application/json; domain-model=launchdarkly.semanticpatch` →
 *     **instructions**, `{instructions: [{kind: "turnFlagOn"}]}`.
 *
 * Send instructions without that parameter and LaunchDarkly reads the body as
 * a JSON Patch, which it is not — so the call fails with a complaint about the
 * patch document rather than anything about the header. Every semantic write in
 * this app goes through one method that sets it, so no action can forget.
 *
 * Instructions are the right format to automate against: `turnFlagOn` means
 * what it says whatever the flag's current shape, while a JSON Patch that
 * assumes an array index is wrong the moment someone adds a rule.
 *
 * ## Four things that go wrong quietly
 *
 *   - **A flag exists in every environment of its project.** Naming the wrong
 *     one does not fail — it toggles the flag somewhere else, successfully.
 *     That is why the environment is its own parameter with its own warning
 *     rather than folded into the project.
 *   - **"On" does not mean everyone gets the new behaviour.** On means the
 *     targeting rules apply; if the fallthrough serves the old variation, on
 *     and off are indistinguishable to users. `flag-get`'s output labels say
 *     so.
 *   - **Segments are per environment, unlike flags.** A segment with the same
 *     key in staging and production is two independent lists that drift.
 *   - **`before`/`after` on the audit log are epoch milliseconds.** An ISO
 *     timestamp is accepted and simply does not filter, so a "changes since
 *     yesterday" query quietly returns everything. This app refuses a
 *     non-numeric value rather than passing it on.
 *
 * ## Archiving is the cleanup verb, not deleting
 *
 * Both stop a flag being evaluated, and code still calling it falls back to the
 * SDK default either way. Archiving is reversible and keeps the history;
 * deleting takes the targeting, the history and the audit trail. `flag-delete`
 * requires an explicit confirmation and points at the other one.
 *
 * `flag-toggle`, `flag-update` and `flag-archive` log at `warn` rather than
 * `info` — a flag change reaches production users within seconds, and the log
 * line may be the only local record of it.
 *
 * Deliberately out of scope:
 *   - **Experiments and guarded rollouts.** Metrics are readable; starting or
 *     stopping an experiment from an unattended workflow is a decision with
 *     statistical consequences, not an operational switch.
 *   - **Creating and deleting projects, environments and members.** Account
 *     administration, and an environment carries SDK keys that would then be
 *     minted by a workflow.
 *   - **Approvals and workflows.** LaunchDarkly's own change-management layer
 *     exists so that changes are reviewed; routing around it from a workflow
 *     step would defeat the point.
 *   - **Code references, integrations, webhooks and the relay proxy** — each
 *     its own surface.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import flagList from "./actions/flag-list.ts";
import flagGet from "./actions/flag-get.ts";
import flagCreate from "./actions/flag-create.ts";
import flagToggle from "./actions/flag-toggle.ts";
import flagUpdate from "./actions/flag-update.ts";
import flagArchive from "./actions/flag-archive.ts";
import flagDelete from "./actions/flag-delete.ts";
import flagStatusList from "./actions/flag-status-list.ts";
import flagStatusGet from "./actions/flag-status-get.ts";
import segmentList from "./actions/segment-list.ts";
import segmentGet from "./actions/segment-get.ts";
import segmentCreate from "./actions/segment-create.ts";
import segmentUpdate from "./actions/segment-update.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import environmentList from "./actions/environment-list.ts";
import environmentGet from "./actions/environment-get.ts";
import auditLogList from "./actions/audit-log-list.ts";
import auditLogGet from "./actions/audit-log-get.ts";
import memberList from "./actions/member-list.ts";
import metricList from "./actions/metric-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // flags — the reason the app exists
    flagList,
    flagGet,
    flagCreate,
    flagToggle,
    flagUpdate,
    flagArchive,
    flagDelete,
    // is anything still using them
    flagStatusList,
    flagStatusGet,
    // segments — the audiences flags target
    segmentList,
    segmentGet,
    segmentCreate,
    segmentUpdate,
    // where flags live
    projectList,
    projectGet,
    environmentList,
    environmentGet,
    // who changed what
    auditLogList,
    auditLogGet,
    memberList,
    // what experiments measure
    metricList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
