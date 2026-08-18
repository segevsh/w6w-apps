import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/transactional-emails` — verified against Loops' OpenAPI document
 * (`listTransactionalEmails`).
 *
 * This lists **every** transactional email including unpublished drafts, which
 * is what makes it useful: `transactional-send` needs a published one, and the
 * id alone does not tell you which you have.
 *
 * Loops has a second, similar endpoint — `GET /v1/transactional`, "list
 * published transactional emails" — offered here as the Published Only option
 * rather than as a separate action, since choosing between them is the whole
 * question.
 */
const action: ActionDefinition = {
  key: "transactional-list",
  type: "read",
  resource: "transactional",
  title: "List transactional emails",
  description: "List transactional templates, all of them or only the published ones.",
  params: [
    {
      key: "publishedOnly",
      label: "Published Only",
      type: "boolean",
      default: false,
      hint: "Only published templates can actually be sent.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const path = p.publishedOnly === true ? "/transactional" : "/transactional-emails";

    ctx.log("info", "listing Loops transactional emails", { path, returnAll, limit });

    return await new LoopsClient(ctx).requestAll(path, {}, returnAll ? Infinity : limit);
  },
};

export default action;
