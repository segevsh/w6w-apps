import { assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";

import listWorkflows from "../../actions/list-workflows.ts";

Deno.test("list-workflows: uses camelCase `perPage`, not `per_page`", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }]);
  await listWorkflows.execute({ page: 2, perPage: 25 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/workflows");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("perPage"), "25");
  assertEquals(url.searchParams.get("per_page"), null, "snake_case would be silently ignored");
});

Deno.test("list-workflows: comma-joins statuses, and omits the param when empty", async () => {
  const a = mockCtx([{ body: { data: [] } }]);
  await listWorkflows.execute({ statuses: ["active", "paused"] }, a.ctx);
  assertEquals(new URL(a.calls[0].url).searchParams.get("statuses"), "active,paused");

  const b = mockCtx([{ body: { data: [] } }]);
  await listWorkflows.execute({ statuses: [] }, b.ctx);
  assertEquals(b.calls[0].url, "https://api.flodesk.com/v1/workflows");
});

Deno.test("list-workflows: offers exactly the documented status enum", () => {
  const statuses = listWorkflows.params!.find((p) => p.key === "statuses")!;
  assertEquals(statuses.type, "multiselect");
  assertEquals(optionValues(statuses), [
    "active",
    "paused",
    "draft",
  ]);
});
