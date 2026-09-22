import type { ActionDefinition } from "@w6w/types";
import { asJson, PracticeBetterClient } from "../lib/client.ts";

/**
 * `POST /consultant/records` — create a client record.
 *
 * Security: `[read, write]`. Body schema: `ClientRecordCreateFragment`.
 *
 * `profile` is the substance of the call and is **required**. It is a
 * `ClientRecordProfile` — the document lists `emailAddress`, `firstName` and
 * `lastName` as required *within* it, with `address`, `dateOfBirth`, `gender`,
 * `homePhone`, `mobilePhone`, `notes` and more optional. It is passed through as
 * a free-form JSON object rather than mirroring every nested field, which is
 * this pack's convention for vendor sub-objects.
 *
 * **`409` means conflict** — the document declares it on this operation, and the
 * usual cause is a record that already exists for that person. It is surfaced as
 * a normal failure whose message says so (see `formatPracticeBetterError`), not
 * swallowed: creating a duplicate record is exactly the thing a caller must not
 * mistake for success.
 *
 * Not idempotent: calling this twice creates two records. Use
 * `list-client-records` to check first if a retry must not leave debris.
 */
interface Input {
  profile: unknown;
  isActive?: boolean;
  parentRecordId?: string;
  formIds?: string[];
  sendInvitation?: boolean;
  documentsFolder?: boolean;
}

const createClientRecord: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-client-record",
  type: "perform",
  resource: "client-record",
  title: "Create Client Record",
  description:
    "Create a client record from a profile. Returns 409 if a conflicting record already exists.",
  idempotent: false,
  params: [
    {
      key: "profile",
      label: "Profile",
      type: "json",
      required: true,
      hint:
        "The `ClientRecordProfile` object. `emailAddress`, `firstName` and `lastName` are required " +
        "inside it; `address`, `dateOfBirth`, `gender`, `homePhone`, `mobilePhone`, `notes` and " +
        "others are optional.",
    },
    {
      key: "isActive",
      label: "Active",
      type: "boolean",
      hint: "Whether the record starts active. The document declares no default for this field.",
    },
    {
      key: "parentRecordId",
      label: "Parent record ID",
      type: "string",
      hint:
        "Attach this record to a parent record — how a household member or dependant is created " +
        "under the person who owns the account.",
    },
    {
      key: "formIds",
      label: "Form IDs",
      type: "array",
      item: { type: "string" },
      hint: "Ids of intake forms to attach to the new record.",
    },
    {
      key: "sendInvitation",
      label: "Send invitation",
      type: "boolean",
      hint:
        "Send the client their invitation to the portal as part of creation. This is the side " +
        "effect that makes retrying a create expensive.",
    },
    {
      key: "documentsFolder",
      label: "Create documents folder",
      type: "boolean",
      hint: "Create the record's documents folder alongside it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "isActive", type: "boolean", label: "Active" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "client", type: "object", label: "The client's own details" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request<Record<string, unknown>>("/consultant/records", {
      method: "POST",
      body: {
        profile: asJson<Record<string, unknown>>(input.profile, "profile"),
        isActive: input.isActive,
        parentRecordId: input.parentRecordId,
        formIds: input.formIds,
        sendInvitation: input.sendInvitation,
        documentsFolder: input.documentsFolder,
      },
    });
  },
};

export default createClientRecord;
