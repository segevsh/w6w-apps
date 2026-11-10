import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollWindow } from "./window.ts";
import contactGetMany from "../actions/contact-get-many.ts";
import leadGetMany from "../actions/lead-get-many.ts";
import opportunityGetMany from "../actions/opportunity-get-many.ts";
import organisationGetMany from "../actions/organisation-get-many.ts";

/** Seconds of look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_SECONDS = 120;
/** `top` per request; Insightly caps a single response at 500. */
export const PAGE_SIZE = 500;
/** Per-check ceiling on pages (2,500 records changed inside one window). */
export const MAX_PAGES = 5;
/** Room for MAX_EVENTS plus an overlap re-list, so an overlap never re-emits an id. */
export const SEEN_WINDOW = 3000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Record_ {
  [key: string]: unknown;
}

interface RecordSpec {
  /** Singular record name, lower case: `contact`. */
  record: string;
  /** Title-case: `Contact`. */
  label: string;
  idField: string;
  /** Key the get-many action returns its array under. */
  listKey: string;
  action: ActionDefinition<Record<string, unknown>>;
  sample: Record_;
  output: OutputField[];
}

const stamps: OutputField[] = [
  { key: "DATE_CREATED_UTC", type: "string", label: "Created (UTC)" },
  { key: "DATE_UPDATED_UTC", type: "string", label: "Updated (UTC)" },
];

const SPECS: RecordSpec[] = [
  {
    record: "contact",
    label: "Contact",
    idField: "CONTACT_ID",
    listKey: "contacts",
    action: contactGetMany as unknown as ActionDefinition<Record<string, unknown>>,
    output: [
      { key: "CONTACT_ID", type: "number", label: "Contact ID" },
      { key: "FIRST_NAME", type: "string", label: "First name" },
      { key: "LAST_NAME", type: "string", label: "Last name" },
      { key: "EMAIL_ADDRESS", type: "string", label: "Email" },
      ...stamps,
    ],
    sample: {
      CONTACT_ID: 101,
      FIRST_NAME: "Jo",
      LAST_NAME: "Park",
      EMAIL_ADDRESS: "jo@acme.test",
      DATE_CREATED_UTC: "2026-11-09 10:00:00",
      DATE_UPDATED_UTC: "2026-11-09 10:00:00",
    },
  },
  {
    record: "lead",
    label: "Lead",
    idField: "LEAD_ID",
    listKey: "leads",
    action: leadGetMany as unknown as ActionDefinition<Record<string, unknown>>,
    output: [
      { key: "LEAD_ID", type: "number", label: "Lead ID" },
      { key: "FIRST_NAME", type: "string", label: "First name" },
      { key: "LAST_NAME", type: "string", label: "Last name" },
      { key: "EMAIL", type: "string", label: "Email" },
      ...stamps,
    ],
    sample: {
      LEAD_ID: 201,
      FIRST_NAME: "Jo",
      LAST_NAME: "Park",
      EMAIL: "jo@acme.test",
      DATE_CREATED_UTC: "2026-11-09 10:00:00",
      DATE_UPDATED_UTC: "2026-11-09 10:00:00",
    },
  },
  {
    record: "opportunity",
    label: "Opportunity",
    idField: "OPPORTUNITY_ID",
    listKey: "opportunities",
    action: opportunityGetMany as unknown as ActionDefinition<Record<string, unknown>>,
    output: [
      { key: "OPPORTUNITY_ID", type: "number", label: "Opportunity ID" },
      { key: "OPPORTUNITY_NAME", type: "string", label: "Name" },
      { key: "BID_AMOUNT", type: "number", label: "Bid amount" },
      ...stamps,
    ],
    sample: {
      OPPORTUNITY_ID: 301,
      OPPORTUNITY_NAME: "Annual licence",
      BID_AMOUNT: 12000,
      DATE_CREATED_UTC: "2026-11-09 10:00:00",
      DATE_UPDATED_UTC: "2026-11-09 10:00:00",
    },
  },
  {
    record: "organisation",
    label: "Organisation",
    idField: "ORGANISATION_ID",
    listKey: "organisations",
    action: organisationGetMany as unknown as ActionDefinition<Record<string, unknown>>,
    output: [
      { key: "ORGANISATION_ID", type: "number", label: "Organisation ID" },
      { key: "ORGANISATION_NAME", type: "string", label: "Name" },
      ...stamps,
    ],
    sample: {
      ORGANISATION_ID: 401,
      ORGANISATION_NAME: "Acme",
      DATE_CREATED_UTC: "2026-11-09 10:00:00",
      DATE_UPDATED_UTC: "2026-11-09 10:00:00",
    },
  },
];

/** Insightly stamps are UTC `YYYY-MM-DD HH:mm:ss`; returns NaN when unparsable. */
export function stampMs(v: unknown): number {
  if (typeof v !== "string" || v === "") return NaN;
  const iso = v.includes("T") ? v : v.replace(" ", "T");
  return Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`);
}

function isoSeconds(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
}

function check(
  spec: RecordSpec,
  mode: "new" | "new-or-updated",
  state: unknown,
  ctx: HookContext,
) {
  const stampField = mode === "new" ? "DATE_CREATED_UTC" : "DATE_UPDATED_UTC";
  return pollWindow<Record_, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_SECONDS * 1000,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf: (r) => {
      const id = String(r[spec.idField]);
      return mode === "new" ? id : `${id}:${String(r.DATE_UPDATED_UTC ?? "")}`;
    },
    // A new record's own creation stamp; an edit's update stamp (an unparsable one is kept).
    tsOf: (r) => {
      const ms = stampMs(r[stampField]);
      return Number.isNaN(ms) ? undefined : ms;
    },
    // Search order is undocumented, so the window is walked by `skip` (a page position that
    // `pollWindow` persists when the window outgrows one check) and the id dedupe decides.
    async load(since, skip) {
      const res = await spec.action.execute({
        updatedAfterUtc: isoSeconds(since),
        top: PAGE_SIZE,
        skip: skip ?? 0,
      }, ctx) as Record<string, unknown>;
      const rows = (res[spec.listKey] as Record_[] | undefined) ?? [];
      return {
        // An edit to an old record is not "new": keep only records created inside the window.
        items: mode === "new-or-updated" ? rows : rows.filter((r) => {
          const created = stampMs(r.DATE_CREATED_UTC);
          return Number.isNaN(created) || created >= since;
        }),
        next: rows.length >= PAGE_SIZE ? (skip ?? 0) + PAGE_SIZE : undefined,
      };
    },
  });
}

function build(spec: RecordSpec, mode: "new" | "new-or-updated"): TriggerDefinition {
  const updated = mode === "new-or-updated";
  return {
    key: updated ? `new-or-updated-${spec.record}` : `new-${spec.record}`,
    title: updated ? `New or Updated ${spec.label}` : `New ${spec.label}`,
    description: updated
      ? `The run gets each ${spec.record} that is created or edited in Insightly (an edit is a new event).`
      : `The run gets each newly created ${spec.record} in Insightly.`,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ state }, ctx) {
      return check(spec, mode, state, ctx);
    },
  };
}

export const recordTriggers: TriggerDefinition[] = SPECS.flatMap((
  s,
) => [build(s, "new"), build(s, "new-or-updated")]);

export function triggerFor(key: string): TriggerDefinition {
  const t = recordTriggers.find((x) => x.key === key);
  if (!t) throw new Error(`unknown insightly trigger ${key}`);
  return t;
}
