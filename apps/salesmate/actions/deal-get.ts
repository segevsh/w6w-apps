import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  dealId: number;
}

const dealGet: ActionDefinition<Input> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Fetch a deal by id.",
  params: [idParam("dealId", "Deal ID")],
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>(
      `/deal/v4/${input.dealId}`,
    );
    return data ?? {};
  },
};

export default dealGet;
