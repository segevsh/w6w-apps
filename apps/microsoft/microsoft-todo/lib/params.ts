/**
 * Param fragments shared by the actions.
 *
 * Graph applies the same OData vocabulary and the same `@odata.nextLink` paging
 * to every To Do collection, so declaring those fields once keeps seven
 * list/read actions honest with each other. Each helper returns a fresh array,
 * so an action can splice in its own fields without mutating a shared object.
 *
 * These are plain data — evaluated at import time, so `describe()` still sees a
 * concrete `Param[]` on every action.
 *
 * **One honest caveat runs through all of it.** The To Do list endpoints say
 * only that they "support *some* of the OData query parameters" and never
 * enumerate which. The delta functions are the one place Microsoft is specific
 * (`$select`, `$top` and `$expand` supported; `$filter`/`$orderby` restricted to
 * `receivedDateTime`; no `$search`), and those constraints are stated on the
 * delta actions themselves. Everywhere else these fields are declared as
 * pass-throughs with that uncertainty in the hint, rather than presented as
 * guaranteed.
 */
import type { OutputField, Param } from "@w6w/types";

/** The task list id. Opaque, server-issued, base64-ish. */
export const taskListParam: Param = {
  key: "taskList",
  label: "Task list",
  type: "string",
  required: true,
  placeholder: "AAMkADIyAAAAABrJAAA=",
  hint:
    "The `todoTaskList` id. Use List Task Lists to find it — the built-in list is the one whose `wellknownListName` is `defaultList`.",
};

/** The task id. */
export const taskParam: Param = {
  key: "task",
  label: "Task",
  type: "string",
  required: true,
  placeholder: "AAMkADIyAAAAABrJAAA=",
  hint: "The `todoTask` id. Use List Tasks to find it.",
};

/** `$select`. */
export function selectParam(hint?: string): Param {
  return {
    key: "select",
    label: "Select fields",
    type: "string",
    repeat: true,
    advanced: true,
    hint: hint ??
      "OData `$select`. Returns only these properties. Microsoft documents To Do as supporting *some* OData parameters without listing them, so treat this as best-effort.",
  };
}

/** `$expand` — the To Do navigation properties worth pulling inline. */
export function expandParam(): Param {
  return {
    key: "expand",
    label: "Expand",
    type: "multiselect",
    advanced: true,
    options: [
      { value: "checklistItems", label: "Checklist items (subtasks)" },
      { value: "linkedResources", label: "Linked resources" },
      { value: "extensions", label: "Open extensions" },
    ],
    hint:
      "OData `$expand`. Pulls a navigation property inline instead of costing a second call. Graph documents `$expand` support explicitly for the todoTask delta function; on the plain reads it is best-effort.",
  };
}

/** `$filter`. */
export function filterParam(hint: string): Param {
  return { key: "filter", label: "Filter", type: "string", advanced: true, hint };
}

/** `$orderby`. */
export function orderByParam(hint: string): Param {
  return { key: "orderBy", label: "Order by", type: "string", advanced: true, hint };
}

/**
 * `$top` plus the `@odata.nextLink` continuation controls.
 *
 * `nextLink` is an absolute URL rather than an opaque token — Graph's paging
 * guidance is to replay it verbatim, because it already carries every query
 * parameter from the original request.
 */
export function pagingParams(opts: { defaultTop?: number; maxTop?: number } = {}): Param[] {
  const defaultTop = opts.defaultTop ?? 50;
  const maxTop = opts.maxTop ?? 999;
  return [
    {
      key: "top",
      label: "Page size",
      type: "number",
      default: defaultTop,
      advanced: true,
      validation: { integer: true, min: 1, max: maxTop },
      hint:
        `OData \`$top\` — results per request. Microsoft publishes no page-size ceiling for To Do, so this is capped at ${maxTop} on our side rather than on a documented limit.`,
    },
    ...continuationParams(),
  ];
}

/** The continuation controls on their own. */
export function continuationParams(): Param[] {
  return [
    {
      key: "nextLink",
      label: "Next link",
      type: "string",
      advanced: true,
      hint:
        "The `@odata.nextLink` URL from a previous run. Continues where that run stopped; the other query params are ignored because the link already carries them.",
    },
    {
      key: "all",
      label: "Fetch all pages",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Follow `@odata.nextLink` until exhausted or the page cap is reached.",
    },
    {
      key: "maxPages",
      label: "Max pages",
      type: "number",
      default: 10,
      advanced: true,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Upper bound on requests when 'Fetch all pages' is on.",
    },
  ];
}

/**
 * The writable `todoTask` fields shared by Create Task and Update Task.
 *
 * Every entry here is a property Microsoft lists in the request-body table of
 * *both* `todotasklist-post-tasks` and `todotask-update`. Read-only and
 * server-stamped properties (`id`, `createdDateTime`, `lastModifiedDateTime`,
 * `bodyLastModifiedDateTime`, `hasAttachments`) are deliberately absent even
 * though the reference tables list them — sending them back is meaningless at
 * best.
 *
 * `recurrence` (a `patternedRecurrence`) is a `json` field rather than a set of
 * form controls: the type nests a `recurrencePattern` and a `recurrenceRange`
 * with a dozen interacting members, and half-modelling it would be worse than
 * passing it through honestly.
 */
export function taskFieldParams(): Param[] {
  return [
    {
      key: "body",
      label: "Notes",
      type: "text",
      hint: "The task's body — what To Do shows as the note under the title.",
    },
    {
      key: "bodyContentType",
      label: "Notes format",
      type: "select",
      advanced: true,
      default: "text",
      options: [
        { value: "text", label: "Plain text" },
        { value: "html", label: "HTML" },
      ],
      hint:
        "Graph's `itemBody.contentType`. Every v1.0 example response comes back as `text`; the update reference carries a stray note claiming only HTML is supported, which its own examples contradict. Both are offered; neither is forced.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "notStarted", label: "Not started" },
        { value: "inProgress", label: "In progress" },
        { value: "completed", label: "Completed" },
        { value: "waitingOnOthers", label: "Waiting on others" },
        { value: "deferred", label: "Deferred" },
      ],
      hint:
        "Graph's `taskStatus`. Only `notStarted` and `completed` are reachable from the To Do apps' own UI; the other three are legacy Outlook-task states that survive on the resource.",
    },
    {
      key: "importance",
      label: "Importance",
      type: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "normal", label: "Normal" },
        { value: "high", label: "High" },
      ],
      hint: "`high` is what To Do renders as the starred / important flag.",
    },
    {
      key: "categories",
      label: "Categories",
      type: "string",
      repeat: true,
      advanced: true,
      hint:
        "Each value must match the `displayName` of an `outlookCategory` the user has already defined — Graph does not create categories implicitly.",
    },
    {
      key: "dueDateTime",
      label: "Due",
      type: "datetime",
      hint:
        "To Do treats due dates as whole days: it stores midnight in the given zone and its clients show the date only.",
    },
    { key: "startDateTime", label: "Start", type: "datetime", advanced: true },
    {
      key: "reminderDateTime",
      label: "Reminder",
      type: "datetime",
      hint: "Set `Reminder on` as well — a reminder time alone does not arm the alert.",
    },
    {
      key: "isReminderOn",
      label: "Reminder on",
      type: "boolean",
      hint: "Arms the alert. Graph defaults this to false.",
    },
    {
      key: "completedDateTime",
      label: "Completed at",
      type: "datetime",
      advanced: true,
      hint: "Only meaningful together with status `completed`.",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      advanced: true,
      default: "UTC",
      placeholder: "Eastern Standard Time",
      hint:
        "Applies to every date field above. Graph's `dateTimeTimeZone` wants a *naive* timestamp plus a separate zone name, so any trailing `Z` or `+02:00` is stripped and this value carries the meaning. Windows names (`Eastern Standard Time`) and IANA names (`America/New_York`) are both accepted.",
    },
    {
      key: "recurrence",
      label: "Recurrence",
      type: "json",
      advanced: true,
      hint:
        'A Graph `patternedRecurrence` object — `{ "pattern": {…}, "range": {…} }`. Passed through verbatim; see the patternedRecurrence reference.',
    },
  ];
}

/** The standard `{ value, nextLink, pages }` output of every list action. */
export function pagedOutput(label: string): OutputField[] {
  return [
    { key: "value", type: "array", label },
    { key: "nextLink", type: "string", label: "Next link" },
    { key: "pages", type: "number", label: "Pages fetched" },
  ];
}

/** A delta action's output — the same, plus the round-closing cursor. */
export function deltaOutput(label: string): OutputField[] {
  return [
    ...pagedOutput(label),
    { key: "deltaLink", type: "string", label: "Delta link (store for the next round)" },
  ];
}

/** The fields a `todoTask` action returns. */
export function taskOutput(): OutputField[] {
  return [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "importance", type: "string", label: "Importance" },
    { key: "body", type: "object", label: "Notes" },
    { key: "dueDateTime", type: "object", label: "Due" },
    { key: "completedDateTime", type: "object", label: "Completed at" },
    { key: "lastModifiedDateTime", type: "string", label: "Last modified" },
  ];
}
