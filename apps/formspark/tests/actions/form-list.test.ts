import { assertEquals, assertRejects } from "@std/assert";
import formList from "../../actions/form-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-list: GET /forms with workspaceId, limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "f1" }]) }]);
  const out = await formList.execute({ workspaceId: "w1", limit: 5, startingAfter: "c" }, ctx);
  assertEquals(pathOf(calls[0].url), "/public/v1/forms");
  assertEquals(queryOf(calls[0].url), { workspaceId: "w1", limit: "5", startingAfter: "c" });
  assertEquals((out as { data: unknown[] }).data, [{ id: "f1" }]);
});

Deno.test("form-list: workspaceId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await formList.execute({ workspaceId: "" }, ctx),
    Error,
    "workspaceId",
  );
  assertEquals(calls.length, 0);
});
