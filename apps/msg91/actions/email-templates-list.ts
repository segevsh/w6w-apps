import type { ActionDefinition } from "@w6w/types";
import { call, pick } from "../lib/client.ts";
import { int, select, str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const STATUS: Record<string, number> = { pending: 1, verified: 2, rejected: 5 };

const emailTemplatesList: ActionDefinition<Input> = {
  key: "email-templates-list",
  type: "search",
  resource: "email",
  title: "List Email Templates",
  description:
    "List the email templates in your MSG91 account, optionally filtered by name or status.",
  params: [
    str("keyword", "Name contains"),
    select("status", "Status", ["verified", "pending", "rejected"], { default: "verified" }),
    int("page", "Page", { default: 1 }),
    int("perPage", "Per page", { default: 25 }),
    select("withVersions", "Include versions", ["no", "yes"], { default: "no" }),
  ],
  output: [{ key: "templates", type: "object", label: "MSG91's templates response" }],

  async execute(input, ctx) {
    const res = await call(ctx, "GET", "/email/templates", {
      query: {
        ...pick({ keyword: input.keyword, page: input.page, per_page: input.perPage }, [
          "keyword",
          "page",
          "per_page",
        ]),
        status_id: STATUS[String(input.status ?? "verified")] ?? 2,
        search_in: input.keyword ? "name" : undefined,
        with: input.withVersions === "yes" ? "versions" : undefined,
      },
    });
    return { templates: res };
  },
};

export default emailTemplatesList;
