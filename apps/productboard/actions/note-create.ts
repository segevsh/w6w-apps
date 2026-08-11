import type { ActionDefinition } from "@w6w/types";
import {
  asJson,
  asOptionalJson,
  compact,
  type DataResult,
  ProductboardClient,
} from "../lib/client.ts";
import { noteTypeOptions } from "../lib/params.ts";

/**
 * `POST /v2/notes` — push feedback into Productboard.
 *
 * The single most likely reason to build this integration, and the one v2
 * behaviour change most likely to break a working v1 integration on the day it
 * is migrated:
 *
 * > **v2 no longer auto-creates the customer.** In v1, `Create a note` accepted
 * > `user.email` or `company.domain` and created that user or company if it did
 * > not exist. In v2 that is gone — *"users and companies must exist before you
 * > can assign a note to them"*, and if the user does not exist the API returns
 * > **404, regardless of whether the associated company exists"*.
 *
 * A 404 from *this* endpoint therefore usually means "unknown customer", not
 * "wrong URL". The fix is to create the user first with
 * `entity-create` (`type: "user"`), then create the note.
 *
 * Relationships can be attached atomically at create time, which is the whole
 * point of the array:
 *
 * ```json
 * "relationships": [
 *   {"type": "customer", "target": {"type": "user", "email": "user@example.com"}},
 *   {"type": "link",     "target": {"type": "link", "id": "<feature uuid>"}}
 * ]
 * ```
 *
 * Read the second one twice. `target.type` for a product link is the literal
 * string **`"link"`** — not `"feature"`, not `"component"`, and not the type of
 * the thing being linked. The vendor's `LinkTargetById` schema declares
 * `type: {enum: ["link"]}` and every one of its own examples repeats it. The
 * intuitive `{"type": "feature", "id": …}` is rejected. `customer` is the
 * sensible one by contrast: its `target.type` really is `user` or `company`,
 * addressed by `id`, or by `email` for a user.
 *
 * **Not idempotent.** No idempotency key exists on this endpoint, so a retry
 * files a second copy of the same feedback. Stamp `metadata.source` with the
 * originating ticket id so duplicates are at least findable.
 */
interface Input {
  type: string;
  fields: unknown;
  relationships?: unknown;
  metadata?: unknown;
}

const noteCreate: ActionDefinition<Input, DataResult> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create note",
  description:
    "Create a customer feedback note, optionally linking it to a customer and to product " +
    "hierarchy entities in the same call. The customer must already exist — v2 does not " +
    "auto-create users or companies.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Note type",
      type: "select",
      required: true,
      default: "textNote",
      options: noteTypeOptions,
      hint: "Opportunity notes are read-only via the API — creating one will be refused.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      placeholder: '{"name": "New note", "content": "This is a new note content."}',
      hint:
        "Field keys come from this workspace's note configuration — run List note configurations. " +
        "Commonly: name, content, tags (array of {name}), owner ({email} or {id}), creator.",
    },
    {
      key: "relationships",
      label: "Relationships",
      type: "json",
      placeholder:
        '[{"type": "customer", "target": {"type": "user", "email": "user@example.com"}}]',
      hint:
        "Attached atomically with the note. A customer relationship targets {type: user|company} " +
        "by id, or a user by email, and 404s if they do not already exist. A product link uses " +
        'the literal target type "link" — {"type": "link", "target": {"type": "link", ' +
        '"id": "<feature uuid>"}} — NOT the type of the entity being linked.',
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      placeholder: '{"source": {"system": "support", "recordId": "ticket-12345"}}',
      hint:
        "Stamp the ticket this feedback came from. `source` takes `system`, `recordId` and an " +
        "optional `url` back to the originating record. This endpoint has no idempotency key, " +
        "so recordId is the only way to spot a duplicate afterwards.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Created note reference" }],

  async execute(input, ctx) {
    ctx.log("info", "creating Productboard note", { type: input.type });
    const data = await new ProductboardClient(ctx).data("/notes", {
      method: "POST",
      body: {
        data: compact({
          type: input.type,
          fields: asJson<Record<string, unknown>>(input.fields, "Fields"),
          relationships: asOptionalJson<unknown[]>(input.relationships, "Relationships"),
          metadata: asOptionalJson<Record<string, unknown>>(input.metadata, "Metadata"),
        }),
      },
    });
    return { data };
  },
};

export default noteCreate;
