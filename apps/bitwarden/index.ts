/**
 * Bitwarden — the organization **Public API**: members, groups, collections,
 * policies, event logs, subscription limits and directory import, at
 * `api.bitwarden.com` / `api.bitwarden.eu`.
 *
 * Every path, verb, parameter and enum here comes from the live OpenAPI 3.0.4
 * document published at bitwarden.com/help/api (16 paths, 28 operations) and was
 * probed against the live identity and API hosts on 2026-10-05.
 *
 * Out of scope: the Vault Management API (a local `bw serve` process, not a
 * hosted API) and self-hosted servers (an arbitrary host cannot be allowlisted
 * without `"*"`).
 */
import type { AppDefinition } from "@w6w/types";
import collectionList from "./actions/collection-list.ts";
import collectionGet from "./actions/collection-get.ts";
import collectionUpdate from "./actions/collection-update.ts";
import collectionDelete from "./actions/collection-delete.ts";
import eventList from "./actions/event-list.ts";
import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupCreate from "./actions/group-create.ts";
import groupUpdate from "./actions/group-update.ts";
import groupDelete from "./actions/group-delete.ts";
import groupMemberIdsGet from "./actions/group-member-ids-get.ts";
import groupMemberIdsSet from "./actions/group-member-ids-set.ts";
import memberList from "./actions/member-list.ts";
import memberGet from "./actions/member-get.ts";
import memberCreate from "./actions/member-create.ts";
import memberUpdate from "./actions/member-update.ts";
import memberRemove from "./actions/member-remove.ts";
import memberGroupIdsGet from "./actions/member-group-ids-get.ts";
import memberGroupIdsSet from "./actions/member-group-ids-set.ts";
import memberReinvite from "./actions/member-reinvite.ts";
import memberRevoke from "./actions/member-revoke.ts";
import memberRestore from "./actions/member-restore.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionUpdate from "./actions/subscription-update.ts";
import organizationImport from "./actions/organization-import.ts";
import policyList from "./actions/policy-list.ts";
import policyGet from "./actions/policy-get.ts";
import policyUpdate from "./actions/policy-update.ts";
import clientCredentials from "./auth/client-credentials.ts";
import service from "./health/service.ts";

const app: AppDefinition = {
  actions: [
    collectionList,
    collectionGet,
    collectionUpdate,
    collectionDelete,
    eventList,
    groupList,
    groupGet,
    groupCreate,
    groupUpdate,
    groupDelete,
    groupMemberIdsGet,
    groupMemberIdsSet,
    memberList,
    memberGet,
    memberCreate,
    memberUpdate,
    memberRemove,
    memberGroupIdsGet,
    memberGroupIdsSet,
    memberReinvite,
    memberRevoke,
    memberRestore,
    subscriptionGet,
    subscriptionUpdate,
    organizationImport,
    policyList,
    policyGet,
    policyUpdate,
  ],
  auth: [clientCredentials],
  healthChecks: [service],
};

export default app;
