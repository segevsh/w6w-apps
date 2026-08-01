import type { AppDefinition } from "@w6w/types";

import createBin from "./actions/create-bin.ts";
import getBin from "./actions/get-bin.ts";
import deleteBin from "./actions/delete-bin.ts";
import getRequest from "./actions/get-request.ts";
import shiftRequest from "./actions/shift-request.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

// PostBin is a genuinely no-auth service — no API key, no OAuth, nothing to
// connect. `auth` is omitted entirely, per "omit for a no-auth app" in
// docs/build-a-w6w-app.md.
export default {
  actions: [
    // bin
    createBin,
    getBin,
    deleteBin,
    // request
    getRequest,
    shiftRequest,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
