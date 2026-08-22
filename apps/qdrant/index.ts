/**
 * Qdrant — work a vector database: create collections, upsert points, query by
 * vector with payload filters, scroll and count, and manage the aliases,
 * indexes and snapshots around them.
 *
 * See `lib/client.ts` for what shapes the app — `points/query` replaced four
 * older endpoints, `with_payload` defaults differently on two of them, and
 * every write returns before it can be read.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import collectionsHealth from "./health/collections.ts";
import quota from "./health/quota.ts";

import collectionList from "./actions/collection-list.ts";
import collectionGet from "./actions/collection-get.ts";
import collectionExists from "./actions/collection-exists.ts";
import collectionCreate from "./actions/collection-create.ts";
import collectionDelete from "./actions/collection-delete.ts";
import pointQuery from "./actions/point-query.ts";
import pointUpsert from "./actions/point-upsert.ts";
import pointGet from "./actions/point-get.ts";
import pointScroll from "./actions/point-scroll.ts";
import pointCount from "./actions/point-count.ts";
import pointDelete from "./actions/point-delete.ts";
import payloadSet from "./actions/payload-set.ts";
import payloadDelete from "./actions/payload-delete.ts";
import indexCreate from "./actions/index-create.ts";
import aliasList from "./actions/alias-list.ts";
import aliasUpdate from "./actions/alias-update.ts";
import snapshotCreate from "./actions/snapshot-create.ts";
import snapshotList from "./actions/snapshot-list.ts";
import instanceInfo from "./actions/instance-info.ts";

const app: AppDefinition = {
  actions: [
    collectionList,
    collectionGet,
    collectionExists,
    collectionCreate,
    collectionDelete,
    pointQuery,
    pointUpsert,
    pointGet,
    pointScroll,
    pointCount,
    pointDelete,
    payloadSet,
    payloadDelete,
    indexCreate,
    aliasList,
    aliasUpdate,
    snapshotCreate,
    snapshotList,
    instanceInfo,
  ],
  auth: [apiKey],
  healthChecks: [service, instance, collectionsHealth, quota],
};

export default app;
