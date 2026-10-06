import { listAction } from "../lib/factory.ts";
import type { PageInput } from "../lib/params.ts";

interface Input extends PageInput {
  active?: boolean;
  objectType?: string;
}

const OBJECT_TYPES = [
  "Customer",
  "Subscription",
  "OptIn",
  "Entrant",
  "Purchase",
  "EventOccurrenceParticipant",
  "Deal",
  "Affiliate",
  "SurveyResponse",
  "WorksheetResponse",
  "CoachingClient",
  "Ticket",
  "SiteMember",
  "SiteGroupRequest",
];

export default listAction<Input>({
  key: "automation-list",
  resource: "automation",
  title: "List Automations",
  description:
    "List the account's automations. Automations that run on contacts have object type " +
    "`Customer`; those are the ones Start Automation / Stop Automation can target.",
  path: "/automations",
  itemsLabel: "Automations",
  params: [
    { key: "active", label: "Active only", type: "boolean", hint: "Set true or false to filter." },
    {
      key: "objectType",
      label: "Object type",
      type: "select",
      options: OBJECT_TYPES.map((value) => ({ value, label: value })),
    },
  ],
  query: (i) => ({
    active: i.active === undefined ? undefined : i.active ? "1" : "0",
    object_type: i.objectType,
  }),
});
