import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `POST /v1/transactional-emails/{transactionalId}/publish` — verified against
 * Loops' OpenAPI document (`publishTransactionalEmail`).
 *
 * **This is the step between "edited" and "sendable".** A transactional email
 * edited through the API sits as a draft; `transactional-send` answers `404`
 * for it, which reads like a wrong id rather than an unpublished template. That
 * is the failure this action exists to close.
 */
const action: ActionDefinition = {
  key: "transactional-publish",
  type: "perform",
  resource: "transactional",
  title: "Publish a transactional email",
  description: "Publish a draft so it can actually be sent.",
  idempotent: true,
  params: [
    {
      key: "transactionalId",
      label: "Transactional ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Published" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.transactionalId ?? "").trim();
    if (!id) throw new Error("`transactionalId` is required");

    ctx.log("info", "publishing a Loops transactional email", { id });

    return await new LoopsClient(ctx).request(
      `/transactional-emails/${encodeURIComponent(id)}/publish`,
      { method: "POST" },
    );
  },
};

export default action;
