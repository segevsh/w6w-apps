import type { ActionDefinition } from "@w6w/types";
import { buildBody, encodeId, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/** `POST /api/v2/tickets/{id}/comment` — add a comment to a support ticket. */
interface Input {
  id: number;
  description: string;
  isPublic?: boolean;
  userId?: number;
  fields?: unknown;
}

const ticketCommentAdd: ActionDefinition<Input> = {
  key: "ticket-comment-add",
  type: "perform",
  resource: "ticket",
  title: "Add Ticket Comment",
  description: "Add a comment to a support ticket.",
  idempotent: false,
  params: [
    idParam("id", "Ticket ID"),
    { key: "description", label: "Comment", type: "text", required: true },
    {
      key: "isPublic",
      label: "Public",
      type: "boolean",
      hint: "Public comments are visible to the customer.",
    },
    { key: "userId", label: "Author user ID", type: "number" },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created comment" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      description: input.description,
      isPublic: input.isPublic,
      user: ref(input.userId),
    });
    const data = await new UpsalesClient(ctx).data(
      "POST",
      `/tickets/${encodeId(input.id)}/comment`,
      { body },
    );
    return { data };
  },
};

export default ticketCommentAdd;
