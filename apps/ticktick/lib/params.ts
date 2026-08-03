/**
 * Param fragments shared by the actions.
 *
 * These are plain data — evaluated at import time, so `describe()` still sees a
 * concrete `Param[]` on every action. Each helper returns a fresh array so an
 * action can splice in its own fields without mutating a shared object.
 *
 * Three vocabularies recur across the whole API and are declared once here, on
 * the theory that a value the vendor enumerates should never be free text:
 *
 *   - **Task priority** — `0` None, `1` Low, `3` Medium, `5` High. Note the
 *     gaps: `2` and `4` are not values, which is exactly the sort of thing a
 *     `number` field would let a user get wrong.
 *   - **Task status** — `0` Normal, `2` Completed. (Subtask status is `0`/`1`,
 *     a *different* scale on the same word; see `Filter Tasks`.)
 *   - **Project view mode / kind** — `list` | `kanban` | `timeline`, and
 *     `TASK` | `NOTE`.
 */
import type { OutputField, Param } from "@w6w/types";

/** The project id. TickTick calls a list a "project" everywhere in the API. */
export const projectParam: Param = {
  key: "projectId",
  label: "Project",
  type: "string",
  required: true,
  placeholder: "6226ff9877acee87727f6bca",
  hint:
    "The project (list) id — a 24-character hex ObjectId. Use List Projects to find it. TickTick's UI calls these Lists; the API calls them Projects.",
};

/** The task id. */
export const taskParam: Param = {
  key: "taskId",
  label: "Task",
  type: "string",
  required: true,
  placeholder: "63b7bebb91c0a5474805fcd4",
  hint: "The task id. Use Filter Tasks or Get Project With Data to find it.",
};

/** Task priority, as a select over the four values TickTick actually defines. */
export const priorityParam: Param = {
  key: "priority",
  label: "Priority",
  type: "select",
  options: [
    { value: 0, label: "None" },
    { value: 1, label: "Low" },
    { value: 3, label: "Medium" },
    { value: 5, label: "High" },
  ],
  hint: "TickTick defines only 0, 1, 3 and 5 — 2 and 4 are not priorities.",
};

/**
 * The writable `Task` fields shared by Create Task and Update Task.
 *
 * Every entry is a row in the request-body table of *both* `POST /task` and
 * `POST /task/{taskId}`. Server-stamped fields the response carries but the
 * request tables do not accept (`id` on create, `status`, `completedTime`,
 * `etag`, `kind`) are deliberately absent — `status` in particular, because
 * completion has its own endpoint and writing it through the task body is not a
 * documented path.
 */
export function taskFieldParams(): Param[] {
  return [
    {
      key: "content",
      label: "Content",
      type: "text",
      hint: "The task's notes body — what TickTick shows under the title.",
    },
    {
      key: "desc",
      label: "Checklist description",
      type: "text",
      advanced: true,
      hint:
        'TickTick documents this as "description of checklist". It is the note shown on a task whose `kind` is `CHECKLIST`; `content` is the note on a plain text task.',
    },
    {
      key: "isAllDay",
      label: "All day",
      type: "boolean",
      hint: "Treat Start / Due as whole days rather than instants.",
    },
    {
      key: "startDate",
      label: "Start",
      type: "datetime",
      hint:
        "Sent as `yyyy-MM-ddTHH:mm:ss+0000` — TickTick's documented format, which is *not* what `toISOString()` produces. Any ISO input is converted for you.",
    },
    {
      key: "dueDate",
      label: "Due",
      type: "datetime",
      hint: "Same format handling as Start.",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      advanced: true,
      placeholder: "America/Los_Angeles",
      hint:
        "An IANA zone name. Unlike Microsoft Graph, TickTick's dates already carry their own numeric offset — this field records the zone the task is *meant* to be read in (it is what drives all-day and recurrence behaviour in the clients).",
    },
    {
      key: "reminders",
      label: "Reminders",
      type: "string",
      repeat: true,
      advanced: true,
      placeholder: "TRIGGER:P0DT9H0M0S",
      hint:
        "RFC 5545 TRIGGER strings, relative to the task's due date. `TRIGGER:PT0S` is 'on time'; `TRIGGER:P0DT9H0M0S` is nine hours after. TickTick documents no absolute-time form.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      repeat: true,
      hint:
        "Tag names. There is no tag endpoint in the Open API, so a tag that does not exist yet is created implicitly by using it here — that is the only way to make one through this API.",
    },
    {
      key: "repeatFlag",
      label: "Repeat rule",
      type: "string",
      advanced: true,
      placeholder: "RRULE:FREQ=DAILY;INTERVAL=1",
      hint:
        "An RFC 5545 RRULE. Passed through verbatim — TickTick documents the example above and nothing about which RRULE parts it honours.",
    },
    priorityParam,
    {
      key: "sortOrder",
      label: "Sort order",
      type: "number",
      advanced: true,
      validation: { integer: true },
      hint:
        "TickTick's manual-ordering key (int64). Its own values are large and negative (`-1099511627776`); leave this empty unless you are reproducing an order you read back.",
    },
    {
      key: "items",
      label: "Subtasks",
      type: "json",
      advanced: true,
      hint:
        'An array of `ChecklistItem` objects — `[{ "title": "…", "status": 0, "startDate": "…", "isAllDay": false, "timeZone": "…", "sortOrder": 0 }]`. Passed through verbatim: there is no per-subtask endpoint in the Open API, so subtasks exist only as this field of their parent task. Note subtask `status` is `0`/`1`, not the task scale of `0`/`2`.',
    },
  ];
}

/** The writable `Project` fields shared by Create Project and Update Project. */
export function projectFieldParams(): Param[] {
  return [
    {
      key: "color",
      label: "Color",
      type: "string",
      placeholder: "#F18181",
      hint: "Hex colour, as TickTick's own example spells it.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "number",
      advanced: true,
      validation: { integer: true },
      hint: "Manual-ordering key (int64). Defaults to 0.",
    },
    {
      key: "viewMode",
      label: "View mode",
      type: "select",
      options: [
        { value: "list", label: "List" },
        { value: "kanban", label: "Kanban" },
        { value: "timeline", label: "Timeline" },
      ],
    },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      options: [
        { value: "TASK", label: "Task list" },
        { value: "NOTE", label: "Note list" },
      ],
      hint:
        "TickTick's Create Project example sends lowercase `task` while the response and the field table both say `TASK`; the documented values are the uppercase ones, so those are what this offers.",
    },
  ];
}

/** The fields a `Task` action returns. */
export function taskOutput(): OutputField[] {
  return [
    { key: "id", type: "string", label: "Task ID" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "content", type: "string", label: "Content" },
    { key: "status", type: "number", label: "Status (0 normal, 2 completed)" },
    { key: "priority", type: "number", label: "Priority" },
    { key: "startDate", type: "string", label: "Start" },
    { key: "dueDate", type: "string", label: "Due" },
    { key: "completedTime", type: "string", label: "Completed at" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "items", type: "array", label: "Subtasks" },
  ];
}

/** The fields a `Project` action returns. */
export function projectOutput(): OutputField[] {
  return [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
    { key: "closed", type: "boolean", label: "Closed" },
    { key: "groupId", type: "string", label: "Group ID" },
    { key: "viewMode", type: "string", label: "View mode" },
    { key: "permission", type: "string", label: "Permission" },
    { key: "kind", type: "string", label: "Kind" },
  ];
}

/** The `{ status }` output of the three endpoints documented as "No Content". */
export function acceptedOutput(): OutputField[] {
  return [{ key: "status", type: "number", label: "HTTP status" }];
}

/** The `{ items }` output of every action that returns a bare JSON array. */
export function arrayOutput(label: string): OutputField[] {
  return [
    { key: "items", type: "array", label },
    { key: "count", type: "number", label: "Count" },
  ];
}

/** The fields an `OpenFocus` action returns. */
export function focusOutput(): OutputField[] {
  return [
    { key: "id", type: "string", label: "Focus ID" },
    { key: "type", type: "number", label: "Type (0 pomodoro, 1 timing)" },
    { key: "taskId", type: "string", label: "Task ID" },
    { key: "note", type: "string", label: "Note" },
    { key: "status", type: "number", label: "Status" },
    { key: "startTime", type: "string", label: "Start" },
    { key: "endTime", type: "string", label: "End" },
    { key: "duration", type: "number", label: "Duration (seconds)" },
  ];
}

/** The fields an `OpenHabit` action returns. */
export function habitOutput(): OutputField[] {
  return [
    { key: "id", type: "string", label: "Habit ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
    { key: "repeatRule", type: "string", label: "Repeat rule" },
    { key: "goal", type: "number", label: "Goal" },
    { key: "step", type: "number", label: "Step" },
    { key: "unit", type: "string", label: "Unit" },
    { key: "totalCheckIns", type: "number", label: "Total check-ins" },
  ];
}

/** `type` — the query parameter every Focus endpoint requires. */
export const focusTypeParam: Param = {
  key: "type",
  label: "Focus type",
  type: "select",
  required: true,
  options: [
    { value: 0, label: "Pomodoro" },
    { value: 1, label: "Timing" },
  ],
  hint:
    "Required on every Focus endpoint. A pomodoro and a timing record can share an id — the type is part of the address, not a filter.",
};

/** The habit id. */
export const habitParam: Param = {
  key: "habitId",
  label: "Habit",
  type: "string",
  required: true,
  placeholder: "habit-1",
  hint: "The habit id. Use List Habits to find it.",
};

/** The writable `OpenHabit` fields shared by Create Habit and Update Habit. */
export function habitFieldParams(): Param[] {
  return [
    { key: "iconRes", label: "Icon", type: "string", advanced: true, placeholder: "habit_reading" },
    { key: "color", label: "Color", type: "string", placeholder: "#4D8CF5" },
    {
      key: "repeatRule",
      label: "Repeat rule",
      type: "string",
      placeholder: "RRULE:FREQ=DAILY;INTERVAL=1",
      hint: "An RFC 5545 RRULE — how often the habit is meant to happen.",
    },
    {
      key: "type",
      label: "Type",
      type: "string",
      placeholder: "Boolean",
      hint:
        'Free text, deliberately. TickTick documents this as `string` and shows only `"Boolean"` in its examples; it does not enumerate the values, so this is not offered as a select.',
    },
    { key: "goal", label: "Goal", type: "number", hint: "Target per period. Defaults to 1." },
    { key: "step", label: "Step", type: "number", advanced: true },
    { key: "unit", label: "Unit", type: "string", placeholder: "Count" },
    { key: "encouragement", label: "Encouragement", type: "string", advanced: true },
    {
      key: "status",
      label: "Status",
      type: "number",
      advanced: true,
      validation: { integer: true },
      hint:
        "TickTick documents this as an int32 without enumerating it. `0` is what an active habit reports.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "number",
      advanced: true,
      validation: { integer: true },
    },
    {
      key: "reminders",
      label: "Reminders",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "Documented only as `< string > array`; TickTick gives no example of a member.",
    },
    { key: "recordEnable", label: "Record enabled", type: "boolean", advanced: true },
    { key: "sectionId", label: "Section ID", type: "string", advanced: true },
    {
      key: "targetDays",
      label: "Target days",
      type: "number",
      advanced: true,
      validation: { integer: true },
    },
    {
      key: "targetStartDate",
      label: "Target start date",
      type: "number",
      advanced: true,
      placeholder: "20240101",
      validation: { integer: true },
      hint: "A `YYYYMMDD` integer, not a date string — the Habit endpoints use date *stamps*.",
    },
    {
      key: "completedCycles",
      label: "Completed cycles",
      type: "number",
      advanced: true,
      validation: { integer: true },
    },
    {
      key: "exDates",
      label: "Excluded dates",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "Dates the repeat rule should skip.",
    },
    { key: "style", label: "Style", type: "number", advanced: true, validation: { integer: true } },
  ];
}
