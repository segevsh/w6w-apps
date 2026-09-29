import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import {
  type PaginationInput,
  paginationOutput,
  paginationParams,
  paginationQuery,
  slugOrIdParam,
  withPagination,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  slugOrId: string;
}

interface WebhooksPage {
  webhooks?: unknown[];
}

/**
 * `GET /forms/{slug_or_id}/webhooks` — list webhooks configured on a form.
 *
 * Business plan only, per Paperform's own docs.
 */
const listFormWebhooks: ActionDefinition<Input> = {
  key: "list-form-webhooks",
  type: "search",
  resource: "webhook",
  title: "List Form Webhooks",
  description: "List webhooks configured on a form. Requires the Business plan.",
  params: [slugOrIdParam, ...paginationParams()],
  output: paginationOutput,

  async execute(input, ctx) {
    const page = await new PaperformClient(ctx).page<WebhooksPage>(
      `/forms/${encodeURIComponent(input.slugOrId)}/webhooks`,
      { query: paginationQuery(input) },
    );
    return withPagination(page.results?.webhooks, page);
  },
};

export default listFormWebhooks;
