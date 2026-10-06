import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = { brandId: string };

/** `GET /v2/settings/brands/{brand-id}`. */
const brandGet: ActionDefinition<Input> = {
  key: "brand-get",
  type: "read",
  resource: "brand",
  title: "Get Brand",
  description: "Get one brand's settings: title, timezone, connected networks and role.",
  params: [str("brandId", "Brand ID", { required: true, hint: "A brand id from List Brands." })],
  output: [
    { key: "id", type: "number", label: "Brand ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "networksData", type: "object", label: "Connected network handles" },
  ],

  async execute(input, ctx) {
    const id = encodeId(input.brandId);
    return (await call(ctx, "GET", `/v2/settings/brands/${id}`)) as Record<string, unknown>;
  },
};

export default brandGet;
