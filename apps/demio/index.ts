/**
 * Demio — webinar platform: list events, read sessions, register attendees and pull the
 * participant report, over the Demio public API v1 (`my.demio.com/api/v1`).
 *
 * Verified 2026-10-05 against the vendor's Apiary blueprint (`publicdemioapi.apib`) and live
 * probes of `my.demio.com` and `status.demio.com`. The blueprint is small and this app covers
 * every operation in it except the duplicate query-string ping (credentials in a URL).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import ping from "./actions/ping.ts";
import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import sessionGet from "./actions/session-get.ts";
import eventRegister from "./actions/event-register.ts";
import participantsList from "./actions/participants-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [ping, eventList, eventGet, sessionGet, eventRegister, participantsList],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
