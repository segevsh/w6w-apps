/**
 * balenaCloud — fleets of Linux devices: inspect them, configure them, choose
 * what they run, and reach into them.
 *
 * Two things shape this app. The obvious listing endpoint, `/v7/application`,
 * answers **200 to a request with no credential at all**, returning the
 * platform's public fleets — so `fleet-list` scopes by organization and
 * `auth.test` probes `/user/v1/whoami` instead. And the actions split across
 * two transports: the OData API for everything stateful, and the supervisor
 * proxy over balena's VPN for the four that reach a device. They fail
 * independently, which is why there are two service checks. See
 * `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import fleetList from "./actions/fleet-list.ts";
import fleetGet from "./actions/fleet-get.ts";
import deviceList from "./actions/device-list.ts";
import deviceGet from "./actions/device-get.ts";
import deviceRename from "./actions/device-rename.ts";
import deviceMove from "./actions/device-move.ts";
import devicePinRelease from "./actions/device-pin-release.ts";
import deviceEnvList from "./actions/device-env-list.ts";
import deviceEnvSet from "./actions/device-env-set.ts";
import deviceTagList from "./actions/device-tag-list.ts";
import deviceTagSet from "./actions/device-tag-set.ts";
import deviceReboot from "./actions/device-reboot.ts";
import deviceRestartServices from "./actions/device-restart-services.ts";
import deviceIdentify from "./actions/device-identify.ts";
import devicePurgeData from "./actions/device-purge-data.ts";
import releaseList from "./actions/release-list.ts";

const app: AppDefinition = {
  actions: [
    fleetList,
    fleetGet,
    deviceList,
    deviceGet,
    deviceRename,
    deviceMove,
    devicePinRelease,
    deviceEnvList,
    deviceEnvSet,
    deviceTagList,
    deviceTagSet,
    deviceReboot,
    deviceRestartServices,
    deviceIdentify,
    devicePurgeData,
    releaseList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
