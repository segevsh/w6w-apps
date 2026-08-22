/**
 * DigitalOcean — droplets, storage, DNS and managed databases.
 *
 * The app is built around one thing: everything here bills by the hour until
 * it is destroyed, and three specific consequences surprise people —
 * a powered-off droplet still bills, destroying a droplet does not destroy its
 * volumes or snapshots, and a reserved IP bills while it is *not* assigned.
 * See `lib/client.ts`; every action that creates, destroys or powers something
 * reports what it does and does not stop paying for.
 */
import type { AppDefinition } from "@w6w/types";

import token from "./auth/token.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import accountGet from "./actions/account-get.ts";
import billingGet from "./actions/billing-get.ts";
import dropletList from "./actions/droplet-list.ts";
import dropletGet from "./actions/droplet-get.ts";
import dropletCreate from "./actions/droplet-create.ts";
import dropletPower from "./actions/droplet-power.ts";
import dropletResize from "./actions/droplet-resize.ts";
import dropletDelete from "./actions/droplet-delete.ts";
import snapshotCreate from "./actions/snapshot-create.ts";
import snapshotList from "./actions/snapshot-list.ts";
import volumeList from "./actions/volume-list.ts";
import reservedIpList from "./actions/reserved-ip-list.ts";
import domainRecordList from "./actions/domain-record-list.ts";
import domainRecordCreate from "./actions/domain-record-create.ts";
import databaseList from "./actions/database-list.ts";

const app: AppDefinition = {
  actions: [
    accountGet,
    billingGet,
    dropletList,
    dropletGet,
    dropletCreate,
    dropletPower,
    dropletResize,
    dropletDelete,
    snapshotCreate,
    snapshotList,
    volumeList,
    reservedIpList,
    domainRecordList,
    domainRecordCreate,
    databaseList,
  ],
  auth: [token],
  healthChecks: [service, quota],
};

export default app;
