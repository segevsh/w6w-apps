import type { AppDefinition } from "@w6w/types";
import identify from "./actions/identify.ts";
import track from "./actions/track.ts";
import page from "./actions/page.ts";
import group from "./actions/group.ts";
import alias from "./actions/alias.ts";
import batch from "./actions/batch.ts";
import writeKey from "./auth/write-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [identify, track, page, group, alias, batch],
  auth: [writeKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
