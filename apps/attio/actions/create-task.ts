import type { ActionDefinition } from "@w6w/types";
import { AttioClient } from "../lib/client.ts";

interface Input {
  content: string;
  deadlineAt?: string | null;
  isCompleted?: boolean;
  assignees?: string[];
  linkedRecords?: unknown;
}

/** Task content max length, from the schema's `maxLength`. */
export const TASK_CONTENT_MAX = 2000;

/**
 * `POST /v2/tasks` — create a task.
 *
 * ## Every field is required, including the empty ones
 *
 * Unusual and worth stating, because it is the thing that makes a
 * hand-assembled body fail: the request schema's `required` list is **all six**
 * properties — `content`, `format`, `deadline_at`, `is_completed`,
 * `linked_records` and `assignees`. Attio does not accept a task body that
 * merely omits the deadline; it wants `"deadline_at": null` said out loud.
 *
 * So this action always sends all six, filling in the neutral values (`null`,
 * `false`, `[]`, `[]`) for anything the user left blank. That is why
 * `lib/client.ts`'s `compact()` is deliberately *not* used here — stripping
 * undefined keys is exactly the wrong behaviour for this one endpoint.
 *
 * ## Content is plaintext, full stop
 *
 * `format` is an enum with **one** member, `"plaintext"`, so it is not exposed
 * as a choice — there is nothing to choose. The schema is explicit about what
 * that excludes: "Rich text formatting, links and @references are not
 * supported", and the endpoint description adds "At present, tasks can only be
 * created from plaintext without record reference formatting."
 *
 * Linking a record is therefore done through `linked_records`, not by typing an
 * @mention into the text: "Creating record links within task content text is not
 * possible via the API at present." Max length 2000 characters, enforced.
 *
 * ## `linked_records` accepts four different shapes
 *
 * The most flexible field in the whole API, and the shorthand is the useful
 * part. All four are documented:
 *
 *  1. **Bare strings** — `["person@company.com", "fundstack.com"]`. "Email
 *     addresses are matched to person records via the `email_addresses`
 *     attribute; domains are matched to company records via the `domains`
 *     attribute." No ids needed at all.
 *  2. **By record id** — `[{"target_object": "people", "target_record_id": "…"}]`.
 *  3. **By any unique matching attribute** —
 *     `[{"target_object": "people", "email_addresses": [{"email_address": "…"}]}]`,
 *     which the schema itself compares to "how you use the `matching_attribute`
 *     query param in Attio's assert endpoints". Matching on multiple values is
 *     not supported, and the attribute must be unique.
 *
 * ## Assignees are workspace members, by email or by id
 *
 * "Only `workspace-member` actors can be assigned to tasks." Either
 * `{"workspace_member_email_address": "alice@attio.com"}` or
 * `{"referenced_actor_type": "workspace-member", "referenced_actor_id": "…"}`.
 * This action takes a plain list of emails-or-UUIDs and picks the right shape
 * per entry, since asking a workflow author to write out the discriminator would
 * be busywork with no upside.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  idempotent: false,
  description:
    "Create a task, optionally assigned to workspace members and linked to records. Content is " +
    "plaintext only — links and @mentions are not supported, so records are attached through the " +
    "Linked records field rather than typed into the text.",
  params: [
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      placeholder: "Follow up on current software solutions",
      hint:
        `Plaintext, up to ${TASK_CONTENT_MAX} characters. Rich text, links and @references are ` +
        "not supported by the API — use Linked records to attach records.",
      validation: { maxLength: TASK_CONTENT_MAX },
    },
    {
      key: "deadlineAt",
      label: "Deadline",
      type: "string",
      placeholder: "2023-01-01T15:00:00.000000000Z",
      hint: "ISO 8601. Leave blank for no deadline — Attio requires the field, so this action " +
        "sends an explicit `null` for you.",
    },
    {
      key: "assignees",
      label: "Assignees",
      type: "array",
      item: { type: "string", placeholder: "alice@attio.com" },
      hint:
        "Workspace members, by **email address or UUID** — each entry is sent in whichever shape " +
        "Attio expects. Only workspace members can be assigned; API tokens and system actors " +
        "cannot.",
    },
    {
      key: "linkedRecords",
      label: "Linked records",
      type: "json",
      hint:
        'Simplest form is a JSON array of strings: `["person@company.com", "fundstack.com"]` — ' +
        "emails match people on `email_addresses`, domains match companies on `domains`. Or be " +
        'explicit: `[{"target_object": "people", "target_record_id": "891dcbfc-…"}]`, or match ' +
        'on any unique attribute: `[{"target_object": "people", "email_addresses": ' +
        '[{"email_address": "alice@website.com"}]}]`.',
    },
    {
      key: "isCompleted",
      label: "Already completed",
      type: "boolean",
      advanced: true,
      hint: "Create the task in the completed state. Defaults to false.",
    },
  ],
  output: [
    { key: "id", type: "object", label: "Composite id (workspace_id, task_id)" },
    { key: "content_plaintext", type: "string", label: "The task text" },
    { key: "deadline_at", type: "string", label: "Deadline, or null" },
    { key: "is_completed", type: "boolean", label: "Completion state" },
    { key: "linked_records", type: "array", label: "Records the task is attached to" },
    { key: "assignees", type: "array", label: "Assigned workspace members" },
  ],

  execute(input, ctx) {
    // NOT `compact()`: this endpoint requires every one of these six keys to be
    // present, so blanks become explicit neutral values rather than omissions.
    return new AttioClient(ctx).data("/tasks", {
      method: "POST",
      body: {
        data: {
          content: input.content,
          format: "plaintext",
          deadline_at: input.deadlineAt ?? null,
          is_completed: input.isCompleted ?? false,
          linked_records: input.linkedRecords ?? [],
          assignees: assigneeRefs(input.assignees),
        },
      },
    });
  },
};

/**
 * Turn a list of "email or UUID" strings into the two shapes Attio accepts.
 *
 * Exported for `tests/actions/create-task.test.ts`, which pins both arms. The
 * discriminator is the `@`: an email address is the documented shorthand, and
 * anything else is treated as an actor id. Getting it backwards produces a 400
 * rather than a silent mis-assignment, but naming the rule here keeps the
 * intent legible.
 */
export function assigneeRefs(assignees: string[] | undefined): Array<Record<string, unknown>> {
  return (assignees ?? []).map((a) =>
    a.includes("@")
      ? { workspace_member_email_address: a }
      : { referenced_actor_type: "workspace-member", referenced_actor_id: a }
  );
}

export default createTask;
