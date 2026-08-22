/**
 * JumpCloud — the directory: users, the devices they log into, the groups that
 * grant them access, and the commands that run on the fleet.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI documents JumpCloud serves from its own docs host
 * (`docs.jumpcloud.com/api/1.0/index.yaml` and `.../api/2.0/index.yaml`, both
 * fetched 2026-08-18), and the behaviours that only show up on the wire were
 * measured against `console.jumpcloud.com` the same day.
 *
 * ## Two APIs, not two versions
 *
 * V2 did not replace V1. Users, devices and commands live on `/api`; groups and
 * the membership graph live on `/api/v2`. A user is at `/api/systemusers/{id}`
 * while the group they belong to is at `/api/v2/usergroups/{id}`, and the two
 * disagree about their list envelope — V1 answers `{results, totalCount}`, V2
 * answers a bare array. An app that knew only one shape would return empty
 * lists from half its own endpoints without erroring, so the client handles
 * both and every action names which API it is on.
 *
 * ## Three regions, and a key belongs to exactly one
 *
 * JumpCloud runs US, EU and India consoles. A key issued in one is rejected by
 * the others as an ordinary 401, and there is no endpoint that says which one a
 * key belongs to — so the region is a connection field, `test` probes the
 * chosen one at connect time, and the `service` health check reports **that
 * region's** components rather than a global roll-up.
 *
 * ## Four ways this API goes wrong quietly
 *
 *   - **A missing api key is a redirect, not a 401.** Measured: a request with
 *     no `x-api-key` answers `302` to `/login`. `fetch` follows redirects by
 *     default, so the naive client gets `200 text/html` and `res.ok === true`,
 *     then fails on `JSON.parse` with a complaint about `<!DOCTYPE` that reads
 *     like a JumpCloud bug. Requests here are made with `redirect: "manual"`
 *     and a 3xx is reported as the missing credential it is.
 *   - **`x-org-id` decides which tenant you change.** An MSP key without it
 *     acts on JumpCloud's default organization for that key — a real
 *     organization, so the call succeeds against the wrong tenant. It is set
 *     once on the connection rather than per action, and `organization-list`
 *     exists to find the id.
 *   - **Device commands queue.** JumpCloud's own wording: *"If a device is
 *     offline, the command will be run when the device becomes available."*
 *     Success means accepted, not done — and for `system-erase` that means an
 *     erase aimed at a switched-off laptop is a landmine that fires whenever it
 *     next opens. There is no unqueue.
 *   - **`command-run` with no device list is not a no-op.** Omitting
 *     `systemIds` runs the command on everything bound to it, which can be the
 *     whole fleet. This app refuses the ambiguity: name devices, or tick the
 *     option that says you meant the bindings.
 *
 * ## Where the destructive verbs live
 *
 * Four actions can do damage that no later call undoes, and each is separated
 * from its safe neighbour rather than sharing a dropdown with it:
 * `system-erase` is its own action so a wrong select value in `system-command`
 * cannot wipe a laptop; `user-delete` is not `user-state-set`, and says so;
 * `system-delete` unenrols rather than wipes; `user-group-delete` takes every
 * binding the group carried. All four require an explicit confirmation flag on
 * top of the id.
 *
 * Deliberately out of scope:
 *   - **Directory Insights**, JumpCloud's event log. It is a separate API with
 *     its own host and its own query language.
 *   - **Policies, MDM, Password Manager and the SaaS/PAM surfaces.** V2 has 699
 *     paths; each of those is its own vocabulary and would make this app about
 *     something other than the directory.
 *   - **System Context auth.** The V1 spec carries a second scheme, a signed
 *     request an agent makes about *itself*. It is for code running on a
 *     managed device, which an App in a sandbox is not.
 *   - **Creating commands.** Running a saved command is a workflow step;
 *     authoring the script that runs as root on the fleet is not something to
 *     do from one, and the API offers no dry run.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";
import userStateSet from "./actions/user-state-set.ts";
import userUnlock from "./actions/user-unlock.ts";
import userPasswordSet from "./actions/user-password-set.ts";
import userPasswordExpire from "./actions/user-password-expire.ts";
import userMfaReset from "./actions/user-mfa-reset.ts";
import userSshkeyList from "./actions/user-sshkey-list.ts";
import userSshkeyAdd from "./actions/user-sshkey-add.ts";
import systemList from "./actions/system-list.ts";
import systemGet from "./actions/system-get.ts";
import systemUpdate from "./actions/system-update.ts";
import systemDelete from "./actions/system-delete.ts";
import systemCommand from "./actions/system-command.ts";
import systemErase from "./actions/system-erase.ts";
import commandList from "./actions/command-list.ts";
import commandGet from "./actions/command-get.ts";
import commandRun from "./actions/command-run.ts";
import commandResultList from "./actions/command-result-list.ts";
import userGroupList from "./actions/user-group-list.ts";
import userGroupGet from "./actions/user-group-get.ts";
import userGroupCreate from "./actions/user-group-create.ts";
import userGroupDelete from "./actions/user-group-delete.ts";
import userGroupMemberList from "./actions/user-group-member-list.ts";
import userGroupMemberSet from "./actions/user-group-member-set.ts";
import systemGroupList from "./actions/system-group-list.ts";
import systemGroupMemberSet from "./actions/system-group-member-set.ts";
import organizationList from "./actions/organization-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // users — the directory record and its lifecycle (V1)
    userList,
    userGet,
    userCreate,
    userUpdate,
    userDelete,
    userStateSet,
    userUnlock,
    userPasswordSet,
    userPasswordExpire,
    userMfaReset,
    userSshkeyList,
    userSshkeyAdd,
    // devices (V1)
    systemList,
    systemGet,
    systemUpdate,
    systemDelete,
    systemCommand,
    systemErase,
    // commands and their results (V1)
    commandList,
    commandGet,
    commandRun,
    commandResultList,
    // groups — where access actually comes from (V2)
    userGroupList,
    userGroupGet,
    userGroupCreate,
    userGroupDelete,
    userGroupMemberList,
    userGroupMemberSet,
    systemGroupList,
    systemGroupMemberSet,
    // tenancy (V1)
    organizationList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
