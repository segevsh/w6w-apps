import { anyEventTrigger } from "../lib/triggers.ts";

export default anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "The run gets each Onfleet webhook delivery for the events you list (empty = every event that needs no threshold), so route-plan, job and other long-tail events are reachable.",
  sample: {
    "triggerId": 22,
    "triggerName": "routePlanCreated",
    "time": 1763467200000,
    "taskId": null,
    "workerId": null,
    "adminId": "vjw*RDMKDljKVDve1Vtcplgu",
    "task": null,
    "worker": null,
    "data": { "routePlan": { "id": "rp_sample" } },
    "status": null,
    "etaSeconds": null,
    "distance": null,
    "delay": null,
    "from": null,
    "to": null,
    "body": null,
    "recipient": null,
    "routePlanId": "rp_sample",
    "dispatchId": null,
    "actionContext": null,
    "delivery": {
      "triggerId": 22,
      "triggerName": "routePlanCreated",
      "time": 1763467200000,
      "routePlanId": "rp_sample",
      "data": { "routePlan": { "id": "rp_sample" } },
    },
  },
});
