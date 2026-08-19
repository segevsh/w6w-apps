/**
 * Particle — the device cloud for connected hardware.
 *
 * What makes this different from every other app here: reading a variable or
 * calling a function is **forwarded to a physical device** and waits for it to
 * answer. So the failure modes are the hardware's — asleep, out of coverage,
 * running firmware that declares something else — and an offline device is very
 * often working exactly as designed. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import accessToken from "./auth/access-token.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import deviceList from "./actions/device-list.ts";
import deviceGet from "./actions/device-get.ts";
import devicePing from "./actions/device-ping.ts";
import deviceRename from "./actions/device-rename.ts";
import deviceSignal from "./actions/device-signal.ts";
import deviceUnclaim from "./actions/device-unclaim.ts";
import diagnosticsGet from "./actions/diagnostics-get.ts";
import variableGet from "./actions/variable-get.ts";
import functionCall from "./actions/function-call.ts";
import eventPublish from "./actions/event-publish.ts";
import productList from "./actions/product-list.ts";
import productDeviceAdd from "./actions/product-device-add.ts";
import simList from "./actions/sim-list.ts";

const app: AppDefinition = {
  actions: [
    deviceList,
    deviceGet,
    devicePing,
    deviceRename,
    deviceSignal,
    deviceUnclaim,
    diagnosticsGet,
    variableGet,
    functionCall,
    eventPublish,
    productList,
    productDeviceAdd,
    simList,
  ],
  auth: [accessToken],
  healthChecks: [service, quota],
};

export default app;
