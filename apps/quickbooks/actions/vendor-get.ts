import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";
import { vendorId } from "../lib/params.ts";

interface Input {
  vendorId: string;
}

const vendorGet: ActionDefinition<Input> = {
  key: "vendor-get",
  type: "read",
  resource: "vendor",
  title: "Get Vendor",
  description: "Read a single vendor by Id.",
  params: [vendorId],
  output: [{ key: "Vendor", type: "object", label: "Vendor" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request(`/vendor/${encodeURIComponent(input.vendorId)}`);
  },
};

export default vendorGet;
