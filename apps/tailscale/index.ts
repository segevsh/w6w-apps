/**
 * Tailscale — the devices, keys, users and access policy of a tailnet.
 *
 * Two things shape this app. First, Tailscale has **no pagination**: the whole
 * tailnet comes back in one response, so `device-list` filters server-side
 * rather than in the workflow. Second, its data plane is **peer-to-peer**, so
 * an API outage stops change rather than traffic — which is why `health/
 * service.ts` reports the coordination service separately from the API.
 *
 * The app reads the policy file and does not write it: `acl-validate` checks a
 * proposed one without installing it, and a change to who may reach what
 * belongs in a reviewed commit rather than a workflow step. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";
import oauthClient from "./auth/oauth-client.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import deviceList from "./actions/device-list.ts";
import deviceGet from "./actions/device-get.ts";
import deviceAuthorize from "./actions/device-authorize.ts";
import deviceTagsSet from "./actions/device-tags-set.ts";
import deviceRoutesGet from "./actions/device-routes-get.ts";
import deviceRoutesSet from "./actions/device-routes-set.ts";
import deviceExpireKey from "./actions/device-expire-key.ts";
import deviceDelete from "./actions/device-delete.ts";
import keyList from "./actions/key-list.ts";
import keyCreate from "./actions/key-create.ts";
import keyDelete from "./actions/key-delete.ts";
import aclGet from "./actions/acl-get.ts";
import aclValidate from "./actions/acl-validate.ts";
import userList from "./actions/user-list.ts";
import userSuspend from "./actions/user-suspend.ts";
import dnsGet from "./actions/dns-get.ts";

const app: AppDefinition = {
  actions: [
    deviceList,
    deviceGet,
    deviceAuthorize,
    deviceTagsSet,
    deviceRoutesGet,
    deviceRoutesSet,
    deviceExpireKey,
    deviceDelete,
    keyList,
    keyCreate,
    keyDelete,
    aclGet,
    aclValidate,
    userList,
    userSuspend,
    dnsGet,
  ],
  auth: [apiKey, oauthClient],
  healthChecks: [service, quota],
};

export default app;
