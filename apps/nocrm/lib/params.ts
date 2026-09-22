import type { Option, OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the noCRM actions.
 *
 * Every name here mirrors a row of the parameter table on noCRM's own API
 * document (<https://www.nocrm.io/api>, read 2026-09-22). Defaults are the
 * document's own "Default" column, quoted rather than guessed — which is why
 * `direction` defaults to `desc` on the lead list but `asc` on the step list
 * and the client-folder list: that is what each table says.
 */

/** `direction` — the ascending/descending control the document repeats across endpoints. */
export function directionParam(defaultValue: "asc" | "desc"): Param {
  return {
    key: "direction",
    label: "Direction",
    type: "select",
    default: defaultValue,
    options: [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending" },
    ],
    hint: "The document's own default here is " + defaultValue + ".",
  };
}

/** Lead statuses, verbatim from the List-the-leads table's `status` row. */
export const leadStatusOptions: Option[] = [
  { value: "todo", label: "To do" },
  { value: "standby", label: "Standby" },
  { value: "won", label: "Won" },
  { value: "cancelled", label: "Cancelled" },
  { value: "lost", label: "Lost" },
];

/** The List-the-leads table's `order` row, in the document's own order. */
export const leadOrderOptions: Option[] = [
  { value: "id", label: "ID" },
  { value: "creation_date", label: "Creation date" },
  { value: "last_update", label: "Last update" },
  { value: "next_action", label: "Next action" },
  { value: "sale_step", label: "Sale step" },
  { value: "amount", label: "Amount" },
  { value: "probability", label: "Probability" },
  { value: "probalized_amount", label: "Probalized amount" },
  { value: "alphabetically", label: "Alphabetically" },
];

/** The List-the-client-folders table's `order` row: `name` or `id`. */
export const clientOrderOptions: Option[] = [
  { value: "name", label: "Name" },
  { value: "id", label: "ID" },
];

/** The List-all-the-users table's `status` row: `all`, `activated`, `deactivated`. */
export const userStatusOptions: Option[] = [
  { value: "all", label: "All" },
  { value: "activated", label: "Activated" },
  { value: "deactivated", label: "Deactivated" },
];

/** The List-all-the-users table's `role` row: `all`, `admin`, `non-admin`. */
export const userRoleOptions: Option[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "non-admin", label: "Non-admin" },
];

/** The Create-a-webhook table's `target_type` row: "Can be `url` (webhook) or `email` (notification)". */
export const webhookTargetTypeOptions: Option[] = [
  { value: "url", label: "URL (webhook)" },
  { value: "email", label: "Email (notification)" },
];

/**
 * The non-parameterised event names from the document's "List of events"
 * section (basic and advanced), offered as a hint rather than a `select`.
 *
 * A select would be wrong: the document also lists `lead.step.changed.to.
 * PIPE.NAME_OF_YOUR_STEP`, where the middle segments are the caller's own
 * pipeline and step names, and it states outright that which events an account
 * may subscribe to "depend[s] on your edition". The event is therefore a free
 * string, and this list is documentation.
 */
/**
 * What a list action returns.
 *
 * Every noCRM list endpoint answers a **bare JSON array**, and the documented
 * `X-TOTAL-COUNT` travels in a header — so there is no body field to name. The
 * actions normalize that into `{ items, totalCount }` (see
 * `NocrmClient.list`) rather than dropping the count on the floor, exactly as
 * `apps/lokalise` does for the same vendor shape.
 */
export function listOutput(label: string): OutputField[] {
  return [
    { key: "items", type: "array", label },
    { key: "totalCount", type: "number", label: "Total before pagination (X-TOTAL-COUNT)" },
  ];
}

/** The documented lead object (the Create/Retrieve/List-a-lead example responses). */
export const leadOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "pipeline", type: "string", label: "Pipeline" },
  { key: "step", type: "string", label: "Step" },
  { key: "step_id", type: "number", label: "Step ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "amount", type: "number", label: "Amount" },
  { key: "probability", type: "number", label: "Probability" },
  { key: "currency", type: "string", label: "Currency" },
  { key: "starred", type: "boolean", label: "Starred" },
  { key: "next_action_at", type: "string", label: "Next action at" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
  { key: "closed_at", type: "string", label: "Closed at" },
  { key: "description", type: "string", label: "Description" },
  { key: "html_description", type: "string", label: "Description (HTML)" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "user_id", type: "number", label: "Assigned user ID" },
  { key: "client_folder_id", type: "number", label: "Client folder ID" },
  { key: "client_folder_name", type: "string", label: "Client folder" },
  { key: "team_id", type: "number", label: "Team ID" },
  { key: "team_name", type: "string", label: "Team" },
];

/** The documented comment object (the Create/Retrieve-comments example responses). */
export const commentOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "content", type: "string", label: "Content" },
  { key: "raw_content", type: "string", label: "Raw content" },
  { key: "commented_item", type: "object", label: "Commented item" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "activity_id", type: "number", label: "Activity ID" },
  { key: "is_pinned", type: "boolean", label: "Pinned" },
  { key: "attachments", type: "array", label: "Attachments" },
  { key: "reactions", type: "array", label: "Reactions" },
  { key: "user", type: "object", label: "Author" },
];

/** The documented client-folder object. */
export const clientFolderOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "is_active", type: "boolean", label: "Active" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "user_id", type: "number", label: "Assigned user ID" },
];

/** The documented user object. */
export const userOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "firstname", type: "string", label: "First name" },
  { key: "lastname", type: "string", label: "Last name" },
  { key: "email", type: "string", label: "Email" },
  { key: "phone", type: "string", label: "Phone" },
  { key: "mobile_phone", type: "string", label: "Mobile phone" },
  { key: "job_title", type: "string", label: "Job title" },
  { key: "is_admin", type: "boolean", label: "Admin" },
  { key: "has_activated", type: "boolean", label: "Activated" },
  { key: "is_disabled", type: "boolean", label: "Disabled" },
  { key: "locale", type: "string", label: "Locale" },
  { key: "time_zone", type: "string", label: "Time zone" },
  { key: "permalink", type: "string", label: "Permalink" },
  { key: "avatar_url", type: "string", label: "Avatar URL" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

/** The documented team object. */
export const teamOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "users", type: "array", label: "Members" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

/** The documented pipeline object. */
export const pipelineOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "is_default", type: "boolean", label: "Default" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

/** The documented step object. */
export const stepOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "position", type: "number", label: "Position" },
  { key: "pipeline_id", type: "number", label: "Pipeline ID" },
  { key: "pipeline", type: "object", label: "Pipeline" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

/** The documented category object. */
export const categoryOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "is_required", type: "boolean", label: "Required" },
  { key: "supertags", type: "array", label: "Predefined tags" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

/** The documented predefined-tag object. */
export const predefinedTagOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "category", type: "string", label: "Category" },
  { key: "category_id", type: "number", label: "Category ID" },
  { key: "position", type: "number", label: "Position" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The documented webhook object. */
export const webhookOutput: OutputField[] = [
  { key: "id", type: "number", label: "ID" },
  { key: "event", type: "string", label: "Event" },
  { key: "target_type", type: "string", label: "Target type" },
  { key: "target", type: "string", label: "Target" },
  { key: "name", type: "string", label: "Name" },
  { key: "params", type: "object", label: "Params" },
  { key: "is_disabled", type: "boolean", label: "Disabled" },
];

export const webhookEventNames: string[] = [
  "lead.creation",
  "lead.status.changed",
  "lead.status.changed.to.cancelled",
  "lead.status.changed.to.lost",
  "lead.status.changed.to.standby",
  "lead.status.changed.to.todo",
  "lead.status.changed.to.won",
  "account.default_field.created",
  "account.default_field.deleted",
  "account.default_field.updated",
  "account.step.created",
  "account.step.deleted",
  "account.step.updated",
  "account.step.pipeline.updated",
  "client_folder.created",
  "lead.assigned",
  "lead.commented",
  "lead.content_has_changed",
  "lead.deleted",
  "lead.manual.trigger",
  "lead.step.changed",
  "lead.unassigned",
  "prospect.created",
  "prospect.updated",
];
