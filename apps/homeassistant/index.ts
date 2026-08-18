/**
 * Home Assistant — read and control an instance: entity states, service calls,
 * history, templates, calendars and events.
 *
 * The thing to know before anything else is in `actions/state-set.ts`: setting
 * a state does not control a device. Controlling a device is `service-call`.
 * `lib/client.ts` covers the rest — the instance is yours, so reachability and
 * `unavailable` entities are the two failure modes that matter.
 */
import type { AppDefinition } from "@w6w/types";

import token from "./auth/token.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import entities from "./health/entities.ts";
import quota from "./health/quota.ts";

import stateList from "./actions/state-list.ts";
import stateGet from "./actions/state-get.ts";
import stateSet from "./actions/state-set.ts";
import stateDelete from "./actions/state-delete.ts";
import serviceCall from "./actions/service-call.ts";
import serviceList from "./actions/service-list.ts";
import entitySwitch from "./actions/entity-switch.ts";
import historyGet from "./actions/history-get.ts";
import logbookGet from "./actions/logbook-get.ts";
import templateRender from "./actions/template-render.ts";
import eventFire from "./actions/event-fire.ts";
import eventList from "./actions/event-list.ts";
import configGet from "./actions/config-get.ts";
import configCheck from "./actions/config-check.ts";
import calendarList from "./actions/calendar-list.ts";
import calendarEvents from "./actions/calendar-events.ts";
import cameraSnapshot from "./actions/camera-snapshot.ts";
import errorLog from "./actions/error-log.ts";
import intentHandle from "./actions/intent-handle.ts";

const app: AppDefinition = {
  actions: [
    stateList,
    stateGet,
    stateSet,
    stateDelete,
    serviceCall,
    serviceList,
    entitySwitch,
    historyGet,
    logbookGet,
    templateRender,
    eventFire,
    eventList,
    configGet,
    configCheck,
    calendarList,
    calendarEvents,
    cameraSnapshot,
    errorLog,
    intentHandle,
  ],
  auth: [token],
  healthChecks: [service, instance, entities, quota],
};

export default app;
