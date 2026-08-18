import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `GET /v1/transactional-emails/{transactionalId}` — verified against Loops'
 * OpenAPI document (`getTransactionalEmail`).
 *
 * The field worth reading before a send is the published state: an unpublished
 * template has an id and returns fine here, and then `404`s on
 * `POST /v1/transactional`.
 */
const action: ActionDefinition = {
  key: "transactional-get",
  type: "read",
  resource: "transactional",
  title: "Get a transactional email",
  description: "Retrieve one transactional template, including whether it is published.",
  params: [
    {
      key: "transactionalId",
      label: "Transactional ID",
      type: "string",
      required: true,
      default: "",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.transactionalId ?? "").trim();
    if (!id) throw new Error("`transactionalId` is required");

    ctx.log("info", "getting a Loops transactional email", { id });

    return await new LoopsClient(ctx).request(
      `/transactional-emails/${encodeURIComponent(id)}`,
    );
  },
};

export default action;
