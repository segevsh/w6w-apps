import { assertEquals } from "@std/assert";
import { listBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get-many.ts";

Deno.test("form-get-many: GETs /forms with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([{ id: "f1" }], { total: 1 }) }]);
  const result = await action.execute({ page: 2, limit: 100 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(result.items, [{ id: "f1" }]);
  assertEquals(result.total, 1);
});

Deno.test("form-get-many: repeats workspaceIds rather than joining them", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }]);
  await action.execute({ workspaceIds: ["w1", "w2"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("workspaceIds"), ["w1", "w2"]);
});

Deno.test("form-get-many: omits unset params", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("form-get-many: advertises Tally's documented 500 limit ceiling", () => {
  const limit = action.params?.find((p) => p.key === "limit");
  assertEquals(limit?.validation?.max, 500);
});
