/**
 * MaintainX — work orders, assets, locations, parts, users, teams, vendors and
 * meters over the REST API v1 (`api.getmaintainx.com/v1`).
 *
 * Every path, verb, parameter and body field was read from the vendor's OpenAPI
 * 3.0 document (`/v1/openapi.json`, fetched 2026-10-06) and spot-checked against
 * the live host. Not covered yet: see README.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import assetCreate from "./actions/asset-create.ts";
import assetGet from "./actions/asset-get.ts";
import assetList from "./actions/asset-list.ts";
import locationCreate from "./actions/location-create.ts";
import locationGet from "./actions/location-get.ts";
import locationList from "./actions/location-list.ts";
import meterList from "./actions/meter-list.ts";
import meterReadingsAdd from "./actions/meter-readings-add.ts";
import organizationList from "./actions/organization-list.ts";
import partList from "./actions/part-list.ts";
import teamList from "./actions/team-list.ts";
import userList from "./actions/user-list.ts";
import vendorList from "./actions/vendor-list.ts";
import workorderCommentAdd from "./actions/workorder-comment-add.ts";
import workorderCommentList from "./actions/workorder-comment-list.ts";
import workorderCreate from "./actions/workorder-create.ts";
import workorderGet from "./actions/workorder-get.ts";
import workorderList from "./actions/workorder-list.ts";
import workorderStatusSet from "./actions/workorder-status-set.ts";
import workorderUpdate from "./actions/workorder-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    workorderList,
    workorderGet,
    workorderCreate,
    workorderUpdate,
    workorderStatusSet,
    workorderCommentList,
    workorderCommentAdd,
    assetList,
    assetGet,
    assetCreate,
    locationList,
    locationGet,
    locationCreate,
    partList,
    userList,
    teamList,
    vendorList,
    meterList,
    meterReadingsAdd,
    organizationList,
  ],
  // API key only: MaintainX publishes no OAuth surface for third parties.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
