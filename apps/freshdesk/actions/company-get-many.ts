import type { ActionDefinition } from "@w6w/types";
import { FreshdeskClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
}

const companyGetMany: ActionDefinition<Input> = {
  key: "company-get-many",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "List companies.",
  params: [...pagination],
  output: [{ key: "companies", type: "array", label: "Companies" }],

  async execute(input, ctx) {
    const companies = await new FreshdeskClient(ctx).request("/companies", {
      query: { page: input.page, per_page: input.perPage },
    });
    return { companies };
  },
};

export default companyGetMany;
