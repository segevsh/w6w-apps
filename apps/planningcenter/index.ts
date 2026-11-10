import type { AppDefinition } from "@w6w/types";
import newEventInstance from "./triggers/new-event-instance.ts";
import newOrUpdatedEventInstance from "./triggers/new-or-updated-event-instance.ts";
import listPeople from "./actions/list-people.ts";
import getPerson from "./actions/get-person.ts";
import createPerson from "./actions/create-person.ts";
import listDonations from "./actions/list-donations.ts";
import listEventInstances from "./actions/list-event-instances.ts";
import listCheckIns from "./actions/list-check-ins.ts";
import personalAccessToken from "./auth/personal-access-token.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [listPeople, getPerson, createPerson, listDonations, listEventInstances, listCheckIns],
  auth: [personalAccessToken],
  healthChecks: [service, quota],
  triggers: [newEventInstance, newOrUpdatedEventInstance],
} satisfies AppDefinition;
