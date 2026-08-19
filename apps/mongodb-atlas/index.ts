/**
 * MongoDB Atlas — the control plane: projects and clusters, database users and
 * IP access lists, alerts, events and the processes behind a cluster.
 *
 * Nothing here reads or writes a document. Querying data means a MongoDB
 * driver speaking the wire protocol to `mongodb+srv://…`, which is a different
 * protocol on a different port. See `lib/client.ts` for the rest of what
 * shapes this app: date-versioned Accept headers that differ per endpoint,
 * `groups` meaning projects, and an authentication scheme that had to be
 * chosen rather than assumed.
 */
import type { AppDefinition } from "@w6w/types";

import serviceAccount from "./auth/service-account.ts";

import service from "./health/service.ts";
import credential from "./health/credential.ts";
import quota from "./health/quota.ts";

import organizationList from "./actions/organization-list.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import clusterList from "./actions/cluster-list.ts";
import clusterGet from "./actions/cluster-get.ts";
import clusterCreate from "./actions/cluster-create.ts";
import clusterUpdate from "./actions/cluster-update.ts";
import clusterPause from "./actions/cluster-pause.ts";
import clusterDelete from "./actions/cluster-delete.ts";
import flexClusterList from "./actions/flex-cluster-list.ts";
import databaseUserList from "./actions/database-user-list.ts";
import databaseUserCreate from "./actions/database-user-create.ts";
import databaseUserDelete from "./actions/database-user-delete.ts";
import accessListGet from "./actions/access-list-get.ts";
import accessListAdd from "./actions/access-list-add.ts";
import accessListDelete from "./actions/access-list-delete.ts";
import alertList from "./actions/alert-list.ts";
import eventList from "./actions/event-list.ts";
import processList from "./actions/process-list.ts";

const app: AppDefinition = {
  actions: [
    organizationList,
    projectList,
    projectGet,
    clusterList,
    clusterGet,
    clusterCreate,
    clusterUpdate,
    clusterPause,
    clusterDelete,
    flexClusterList,
    databaseUserList,
    databaseUserCreate,
    databaseUserDelete,
    accessListGet,
    accessListAdd,
    accessListDelete,
    alertList,
    eventList,
    processList,
  ],
  auth: [serviceAccount],
  healthChecks: [service, credential, quota],
};

export default app;
