import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import createBitlink from "./actions/create-bitlink.ts";
import getBitlink from "./actions/get-bitlink.ts";
import updateBitlink from "./actions/update-bitlink.ts";
import listBitlinks from "./actions/list-bitlinks.ts";
import expandBitlink from "./actions/expand-bitlink.ts";
import getBitlinkClicks from "./actions/get-bitlink-clicks.ts";
import getBitlinkClicksSummary from "./actions/get-bitlink-clicks-summary.ts";
import listGroups from "./actions/list-groups.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // bitlink
    createBitlink,
    getBitlink,
    updateBitlink,
    listBitlinks,
    expandBitlink,
    getBitlinkClicks,
    getBitlinkClicksSummary,
    // group
    listGroups,
  ],
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
