import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import listActivities from "../actions/list-activities.ts";
import listContacts from "../actions/list-contacts.ts";
import listLeads from "../actions/list-leads.ts";
import listTasks from "../actions/list-tasks.ts";
import listUsers from "../actions/list-users.ts";
import search from "../actions/search.ts";

const asAction = (a: unknown) => a as ActionDefinition;
const itemsOf = (result: unknown): unknown[] => (result as { data?: unknown[] }).data ?? [];
const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");
const out = (label: string, extra: OutputField[] = []): OutputField[] => [
  { key: "id", type: "string", label: `${label} ID` },
  ...extra,
  { key: "date_created", type: "string", label: "Created" },
];

/**
 * `POST /data/search/` (Advanced Filtering) with `sort: [{field: date_created, direction: desc}]`
 * lists leads newest-created first. Docs: https://developer.close.com/api/resources/advanced-filtering/search
 */
export const newLead: TriggerDefinition = pollFromListAction({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each newly created Close lead.",
  action: asAction(search),
  input: () => ({
    query: {
      type: "and",
      queries: [{ type: "object_type", object_type: "lead" }],
    },
    limit: 100,
    fields: { lead: ["id", "display_name", "status_label", "date_created"] },
    sort: [{
      direction: "desc",
      field: { type: "regular_field", object_type: "lead", field_name: "date_created" },
    }],
  }),
  items: itemsOf,
  idOf,
  output: out("Lead", [
    { key: "display_name", type: "string", label: "Name" },
    { key: "status_label", type: "string", label: "Status" },
  ]),
  sample: {
    id: "lead_sample",
    display_name: "Bluth Company",
    status_label: "Potential",
    date_created: "2026-11-09T09:00:00.000000+00:00",
  },
  maxPages: 1,
});

/** `GET /lead/` is documented as "most recently updated first" (leads/list). */
export const updatedLead: TriggerDefinition = pollFromListAction({
  key: "new-or-updated-lead",
  title: "New or Updated Lead",
  description: "The run gets each Close lead that is created or edited.",
  action: asAction(listLeads),
  input: () => ({ limit: 100, skip: 0 }),
  items: itemsOf,
  idOf: (item) => `${idOf(item)}:${(item as { date_updated?: string }).date_updated ?? ""}`,
  output: out("Lead", [
    { key: "display_name", type: "string", label: "Name" },
    { key: "status_label", type: "string", label: "Status" },
    { key: "date_updated", type: "string", label: "Last updated" },
  ]),
  sample: {
    id: "lead_sample",
    display_name: "Bluth Company",
    status_label: "Potential",
    date_created: "2026-11-09T09:00:00.000000+00:00",
    date_updated: "2026-11-09T11:00:00.000000+00:00",
  },
  maxPages: 1,
});

/** `GET /contact/` is documented as "newest first (by `date_created`)" (contacts/list). */
export const newContact: TriggerDefinition = pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created Close contact.",
  action: asAction(listContacts),
  input: () => ({ limit: 100, skip: 0 }),
  items: itemsOf,
  idOf,
  output: out("Contact", [
    { key: "lead_id", type: "string", label: "Lead ID" },
    { key: "name", type: "string", label: "Name" },
  ]),
  sample: {
    id: "cont_sample",
    lead_id: "lead_sample",
    name: "Gob Bluth",
    date_created: "2026-11-09T09:00:00.000000+00:00",
  },
  maxPages: 1,
});

/** `_order_by` accepts `date` or `date_created`, `-` for descending (tasks/list). */
export const newTask: TriggerDefinition = pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each newly created Close task.",
  action: asAction(listTasks),
  input: () => ({ orderBy: "-date_created", limit: 100, skip: 0 }),
  items: itemsOf,
  idOf,
  output: out("Task", [
    { key: "lead_id", type: "string", label: "Lead ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "date", type: "string", label: "Due" },
    { key: "assigned_to", type: "string", label: "Assigned to" },
    { key: "is_complete", type: "boolean", label: "Complete" },
  ]),
  sample: {
    id: "task_sample",
    lead_id: "lead_sample",
    text: "Call back",
    date: "2026-11-12",
    assigned_to: "user_sample",
    is_complete: false,
    date_created: "2026-11-09T09:00:00.000000+00:00",
  },
  maxPages: 1,
});

/** `_order_by` sorts activities by `date_created` (activities/list). */
export const newActivity: TriggerDefinition = pollFromListAction({
  key: "new-activity",
  title: "New Activity",
  description: "The run gets each new activity (call, email, note, meeting, …) on any lead.",
  action: asAction(listActivities),
  input: () => ({ orderBy: "-date_created", limit: 100, skip: 0 }),
  items: itemsOf,
  idOf,
  output: out("Activity", [
    { key: "_type", type: "string", label: "Activity type" },
    { key: "lead_id", type: "string", label: "Lead ID" },
    { key: "contact_id", type: "string", label: "Contact ID" },
    { key: "user_id", type: "string", label: "User ID" },
  ]),
  sample: {
    id: "acti_sample",
    _type: "Note",
    lead_id: "lead_sample",
    contact_id: null,
    user_id: "user_sample",
    date_created: "2026-11-09T09:00:00.000000+00:00",
  },
  maxPages: 1,
});

export const MAX_USER_PAGES = 5;
export const USER_PAGE = 100;

/**
 * An organisation's users are its own team (a few dozen, bounded): `GET /user/` has no created
 * order or since filter, so up to 500 users are read and diffed by id (added only).
 */
export const newUser: TriggerDefinition = {
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Close organization.",
  output: out("User", [
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ]),
  sample: {
    id: "user_sample",
    first_name: "Tobias",
    last_name: "Funke",
    email: "tobias@example.com",
    date_created: "2026-11-09T09:00:00.000000+00:00",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const users: Array<{ id?: string }> = [];
    for (let page = 0; page < MAX_USER_PAGES; page++) {
      const res = await listUsers.execute({ limit: USER_PAGE, skip: page * USER_PAGE }, ctx) as {
        data?: Array<{ id?: string }>;
        has_more?: boolean;
      };
      users.push(...(res.data ?? []));
      if (!res.has_more) break;
    }
    const byId = new Map(users.filter((u) => u.id).map((u) => [String(u.id), u]));
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};
