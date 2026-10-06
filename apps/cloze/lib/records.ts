import type { HookContext, Param } from "@w6w/types";
import { call, parseJsonField, parseList, pick, requireStr } from "./client.ts";
import { bool, int, json, select, str, text } from "./params.ts";

export interface Entity {
  /** Path segment under `/v1/`. */
  path: "people" | "companies" | "projects";
  /** Array key in find/feed/getmany responses. */
  list: string;
  /** Object key in a get response. */
  one: string;
  noun: string;
}

export const PERSON: Entity = { path: "people", list: "people", one: "person", noun: "person" };
export const COMPANY: Entity = {
  path: "companies",
  list: "companies",
  one: "company",
  noun: "company",
};
export const PROJECT: Entity = {
  path: "projects",
  list: "projects",
  one: "project",
  noun: "project",
};

// --- reads ------------------------------------------------------------------

const FIND_KEYS = [
  "pagesize",
  "pagenumber",
  "sort",
  "sortdir",
  "scope",
  "freeformquery",
  "stage",
  "segment",
  "step",
  "assignee",
  "assigned",
  "format",
] as const;

export const findParams = (e: Entity): Param[] => [
  str("freeformquery", "Search query", {
    hint: "Cloze's natural-language search, the same text the Cloze search box takes.",
  }),
  str("stage", "Stage", {
    hint: e.path === "projects"
      ? "future, current, pending, won or lost. `none` = no stage, `any` = any stage."
      : "lead, future, current, past or out. `none` = no stage, `any` = any stage.",
  }),
  str("segment", "Segment", { hint: "A segment name or key. `none` / `any` are accepted." }),
  str("step", "Next step ID", { hint: "Unique ID of a Next Step. `none` / `any` are accepted." }),
  str("assignee", "Assignee e-mail", { hint: "Used with Assigned." }),
  bool("assigned", "Assigned", { hint: "true for assigned records only." }),
  select("scope", "Scope", ["local", "team"], {
    hint: "local (your own) or team relations. A hierarchy path is also accepted by the API.",
  }),
  str("sort", "Sort", {
    hint: "lastchanged, bestrelationship, firstmet, lasttalked, wentquiet, assigned, duenext, " +
      "duepast, first, last, nextstep, distance, value, created, start, end or name.",
  }),
  select("sortdir", "Sort direction", ["asc", "dec"]),
  int("pagesize", "Page size", { hint: "Results per page (vendor default 10, maximum 1000)." }),
  int("pagenumber", "Page number", { hint: "1-based. Default 1." }),
  bool("format", "Formatted custom fields", {
    hint: "Return formatted names and values for custom fields.",
  }),
];

export async function findRecords(
  ctx: HookContext,
  e: Entity,
  input: Record<string, unknown>,
  extra: readonly string[] = [],
) {
  const query = pick(input, [...FIND_KEYS, ...extra]) as Record<string, string>;
  const body = await call(ctx, "GET", `/v1/${e.path}/find`, { query });
  const items = (body[e.list] as unknown[] | undefined) ?? [];
  return {
    items,
    count: items.length,
    availableCount: body.availablecount,
    pageNumber: body.pagenumber,
    pageSize: body.pagesize,
  };
}

export const feedParams = (): Param[] => [
  str("cursor", "Cursor", {
    hint: "The `cursor` of the previous result. Leave empty on the first call; the filters below " +
      "apply to that first call only.",
  }),
  str("modifiedafter", "Modified after", {
    hint: "First call only. UTC milliseconds, or `now` to stream only future changes.",
  }),
  str("freeformquery", "Search query", { hint: "First call only." }),
  str("stage", "Stage", { hint: "First call only." }),
  str("segment", "Segment", { hint: "First call only." }),
  select("scope", "Scope", ["local", "team"], { hint: "First call only." }),
  int("pagesize", "Page size", { hint: "First call only. Default 10, maximum 1000." }),
];

export async function feedRecords(ctx: HookContext, e: Entity, input: Record<string, unknown>) {
  const query = pick(input, [
    "cursor",
    "modifiedafter",
    "freeformquery",
    "stage",
    "segment",
    "scope",
    "pagesize",
  ]) as Record<string, string>;
  const body = await call(ctx, "GET", `/v1/${e.path}/feed`, { query });
  const items = (body[e.list] as unknown[] | undefined) ?? [];
  return { items, count: items.length, availableCount: body.availablecount, cursor: body.cursor };
}

export const getParams = (e: Entity): Param[] => [
  str("id", `${cap(e.noun)} ID`, {
    required: true,
    hint: "A syncKey, portableId or unique ID; for a person, an e-mail address or mobile number " +
      "also works.",
  }),
  bool("team", "Team relation", { hint: "true for the team's copy rather than your own." }),
  bool("format", "Formatted custom fields"),
  ...(e.path === "projects" ? [bool("detailed", "Detailed", { hint: "Retrieve detail." })] : []),
];

export async function getRecord(ctx: HookContext, e: Entity, input: Record<string, unknown>) {
  const query = {
    id: requireStr("id", input.id),
    ...pick(input, ["team", "format", "detailed"]),
  } as Record<string, string>;
  const body = await call(ctx, "GET", `/v1/${e.path}/get`, { query });
  return (body[e.one] as Record<string, unknown> | undefined) ?? {};
}

export const getManyParams = (e: Entity): Param[] => [
  json("uniqueids", "IDs", {
    required: true,
    hint: `JSON array (or comma-separated text) of ${e.noun} IDs: syncKeys, portableIds or ` +
      "unique IDs.",
  }),
  bool("team", "Team relation"),
  bool("format", "Formatted custom fields"),
];

export async function getManyRecords(
  ctx: HookContext,
  e: Entity,
  input: Record<string, unknown>,
) {
  const uniqueids = parseList("uniqueids", input.uniqueids);
  if (uniqueids.length === 0) throw new Error("uniqueids is required");
  const body = await call(ctx, "POST", `/v1/${e.path}/getmany`, {
    body: { uniqueids, ...pick(input, ["team", "format"]) },
  });
  const items = (body[e.list] as unknown[] | undefined) ?? [];
  return { items, count: items.length };
}

export async function deleteRecord(ctx: HookContext, e: Entity, input: Record<string, unknown>) {
  const query = { id: requireStr("id", input.id), ...pick(input, ["team"]) } as Record<
    string,
    string
  >;
  await call(ctx, "DELETE", `/v1/${e.path}/delete`, { query });
  return { deleted: true, id: query.id };
}

export const deleteParams = (e: Entity): Param[] => [
  str("id", `${cap(e.noun)} ID`, { required: true, hint: "syncKey, portableId or unique ID." }),
  bool("team", "Team relation", {
    hint: "true deletes the team relation rather than your local one.",
  }),
];

// --- timeline ---------------------------------------------------------------

export const timelineParams = (e: Entity): Param[] => [
  str("id", `${cap(e.noun)} ID`, { required: true, hint: "syncKey, portableId or unique ID." }),
  int("limit", "Limit", { hint: "Approximate maximum entries; the server may return more." }),
  int("stamp", "Stamp", { hint: "The `stamp` of the previous result, to page further back." }),
  json("filter", "Filter", {
    hint: "JSON array of: mail, meeting, call, sms, message, inapp, todo, nextstep, note, " +
      "audit, external.",
  }),
  bool("shared", "Include shared", { hint: "Include messages shared by other users." }),
  bool("remindersOnly", "Reminders only"),
  bool("documentsOnly", "Documents only"),
];

export async function timeline(ctx: HookContext, e: Entity, input: Record<string, unknown>) {
  const body: Record<string, unknown> = {
    id: requireStr("id", input.id),
    ...pick(input, ["limit", "stamp", "shared", "remindersOnly", "documentsOnly"]),
  };
  if (input.filter !== undefined && input.filter !== "") {
    body.filter = parseList("filter", input.filter);
  }
  const res = await call(ctx, "POST", `/v1/${e.path}/timeline`, { body });
  const messages = (res.messages as unknown[] | undefined) ?? [];
  return { messages, count: messages.length, stamp: res.stamp };
}

// --- writes -----------------------------------------------------------------

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const contactFields = (): Param[] => [
  json("emails", "E-mail addresses", {
    hint: 'JSON array of {"value": "a@b.com", "work": true, "preferred": true}.',
  }),
  json("phones", "Phone numbers", {
    hint: 'JSON array of {"value": "+15551234567", "mobile": true}.',
  }),
  json("addresses", "Addresses", {
    hint: 'JSON array of {"street", "city", "region", "country", "postcode", "work", "home"}.',
  }),
  json("socials", "Social handles", { hint: 'JSON array of {"type": "twitter", "value": "..."}.' }),
];

const commonFields = (e: Entity): Param[] => [
  str("syncKey", "Cloze ID (syncKey)", {
    hint: `Cloze's own key for the ${e.noun}; identifies the record to update.`,
  }),
  json("uniqueids", "Unique IDs", {
    hint: "JSON array (or comma-separated text) of opaque IDs, e.g. your own system's ID. Any " +
      "one of them matches the record on later calls.",
  }),
  text("keywords", "Tags", { hint: "Comma-separated text or a JSON array of tags." }),
  json("customFields", "Custom fields", {
    hint: 'JSON array of {"id": "...", "value": ...}. See "List Custom Fields" for ids.',
  }),
  json("appLinks", "App links", {
    hint: 'JSON array of {"source": "example.com", "uniqueid": "...", "label", "url"}.',
  }),
  str("segment", "Segment"),
  str("step", "Next step ID"),
  text("notes", "About notes"),
  text("atAGlanceNotes", "At-a-glance notes"),
  str("assignTo", "Assign to", { hint: "Team member e-mail." }),
  str("shareTo", "Share to", { hint: "`team` to share the record with the team." }),
  bool("archived", "Archived", { hint: "true archives the record, false unarchives it." }),
  str("account", "Account", {
    hint: "Team admins only: the e-mail of the team member whose account to write to.",
  }),
  bool("dryrun", "Dry run", { hint: "Validate everything but do not write." }),
];

export const personFields = (): Param[] => [
  str("name", "Full name"),
  str("first", "First name"),
  str("middle", "Middle name"),
  str("last", "Last name"),
  str("email", "E-mail", { hint: "Convenience for one address; merged into E-mail addresses." }),
  str("phone", "Phone", { hint: "Convenience for one number; merged into Phone numbers." }),
  str("headline", "Headline"),
  select("stage", "Stage", ["lead", "future", "current", "past", "out"]),
  str("country", "Country"),
  str("location", "Location"),
  str("locale", "Locale"),
  str("gender", "Gender"),
  str("birthday", "Birthday", { hint: "yyyy-MM-dd." }),
  bool("private", "Private"),
  ...contactFields(),
  json("companies", "Companies", {
    hint: "JSON array of company objects to create or update and link to this person.",
  }),
  json("projects", "Projects", {
    hint: "JSON array of project objects to create or update and link to this person.",
  }),
  ...commonFields(PERSON),
];

export const companyFields = (): Param[] => [
  str("name", "Name"),
  text("description", "Description"),
  str("industry", "Industry"),
  str("businessSize", "Business size"),
  str("employees", "Employees", { hint: "A range such as 10-100." }),
  str("headline", "Headline"),
  select("stage", "Stage", ["lead", "future", "current", "past", "out"]),
  str("country", "Country"),
  str("location", "Location"),
  str("locale", "Locale"),
  text("domains", "Domains", { hint: "Comma-separated text or a JSON array of domain names." }),
  ...contactFields(),
  ...commonFields(COMPANY),
];

export const projectFields = (): Param[] => [
  str("name", "Name"),
  text("summary", "Summary"),
  select("stage", "Stage", ["future", "current", "pending", "won", "lost"]),
  text("projectTeam", "Collaborators", {
    hint: "Comma-separated team member e-mails, or a JSON array.",
  }),
  str("createdDate", "Created date"),
  str("startDate", "Start date"),
  str("pendingDate", "Pending date"),
  str("endDate", "End date", { hint: "When it was or will be won, done or lost." }),
  json("addresses", "Addresses", { hint: "JSON array of address objects." }),
  json("clientpeople", "Client people", { hint: "JSON array of person objects." }),
  json("partnerpeople", "Partner people", { hint: "JSON array of person objects." }),
  json("clientcompanies", "Client companies", { hint: "JSON array of company objects." }),
  json("partnercompanies", "Partner companies", { hint: "JSON array of company objects." }),
  ...commonFields(PROJECT),
];

const SCALARS: Record<Entity["path"], readonly string[]> = {
  people: [
    "syncKey",
    "name",
    "first",
    "middle",
    "last",
    "headline",
    "stage",
    "segment",
    "step",
    "country",
    "location",
    "locale",
    "gender",
    "birthday",
    "private",
    "notes",
    "atAGlanceNotes",
    "assignTo",
    "shareTo",
    "archived",
    "account",
    "dryrun",
  ],
  companies: [
    "syncKey",
    "name",
    "description",
    "industry",
    "businessSize",
    "employees",
    "headline",
    "stage",
    "segment",
    "step",
    "country",
    "location",
    "locale",
    "notes",
    "atAGlanceNotes",
    "assignTo",
    "shareTo",
    "archived",
    "account",
    "dryrun",
  ],
  projects: [
    "syncKey",
    "name",
    "summary",
    "stage",
    "segment",
    "step",
    "notes",
    "atAGlanceNotes",
    "createdDate",
    "startDate",
    "pendingDate",
    "endDate",
    "assignTo",
    "shareTo",
    "archived",
    "account",
    "dryrun",
  ],
};
const JSONS = [
  "customFields",
  "appLinks",
  "emails",
  "phones",
  "addresses",
  "socials",
  "companies",
  "projects",
  "clientpeople",
  "partnerpeople",
  "clientcompanies",
  "partnercompanies",
];
const LISTS = ["uniqueids", "keywords", "domains", "projectTeam"];

/** Build a create/update body from form input, sending only what was set. */
export function recordBody(e: Entity, input: Record<string, unknown>): Record<string, unknown> {
  const body = pick(input, SCALARS[e.path]);
  for (const k of JSONS) {
    const v = input[k];
    if (v === undefined || v === null || v === "") continue;
    body[k] = parseJsonField(k, v);
  }
  for (const k of LISTS) {
    const v = input[k];
    if (v === undefined || v === null || v === "") continue;
    body[k] = parseList(k, v);
  }
  if (e.path === "people") {
    const email = String(input.email ?? "").trim();
    if (email) body.emails = [...(body.emails as unknown[] ?? []), { value: email }];
    const phone = String(input.phone ?? "").trim();
    if (phone) body.phones = [...(body.phones as unknown[] ?? []), { value: phone }];
  }
  return body;
}

export async function writeRecord(
  ctx: HookContext,
  e: Entity,
  verb: "create" | "update",
  input: Record<string, unknown>,
) {
  const body = recordBody(e, input);
  if (Object.keys(body).length === 0) throw new Error(`Nothing to ${verb}: no fields were set`);
  const res = await call(ctx, "POST", `/v1/${e.path}/${verb}`, { body });
  return { ok: true, message: res.message ?? null };
}

export const writeOutput = [
  { key: "ok", type: "boolean" as const, label: "Accepted by Cloze" },
  { key: "message", type: "string" as const, label: "Cloze's message (writes return no record)" },
];
