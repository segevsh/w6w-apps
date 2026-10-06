import type { ActionDefinition } from "@w6w/types";
import { DiffbotClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/** `GET /v3/crawl?name=…&delete=1` — "Job deletions are irreversible." */
const crawlDelete: ActionDefinition<Input> = {
  key: "crawl-delete",
  type: "perform",
  resource: "crawl",
  title: "Delete Crawl Job",
  description: "Delete a crawl job and all of its extracted data, permanently.",
  idempotent: true,
  params: [{ key: "name", label: "Job name", type: "string", required: true }],
  output: [
    { key: "deleted", type: "boolean", label: "The vendor accepted the deletion" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const { body } = await new DiffbotClient(ctx).request("/v3/crawl", {
      query: { name: input.name.trim(), delete: "1" },
    });
    const r = (body ?? {}) as { response?: string };
    return { deleted: true, message: r.response };
  },
};

export default crawlDelete;
