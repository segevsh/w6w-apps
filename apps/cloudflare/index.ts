import type { AppDefinition } from "@w6w/types";
import zoneList from "./actions/zone-list.ts";
import zoneGet from "./actions/zone-get.ts";
import zoneSettingsGet from "./actions/zone-settings-get.ts";
import zoneAnalyticsGet from "./actions/zone-analytics-get.ts";
import cachePurge from "./actions/cache-purge.ts";
import dnsRecordList from "./actions/dns-record-list.ts";
import dnsRecordCreate from "./actions/dns-record-create.ts";
import dnsRecordDelete from "./actions/dns-record-delete.ts";
import apiToken from "./auth/api-token.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    zoneList,
    zoneGet,
    zoneSettingsGet,
    zoneAnalyticsGet,
    cachePurge,
    dnsRecordList,
    dnsRecordCreate,
    dnsRecordDelete,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
