import { assertEquals } from "@std/assert";
import lifecycleHistoryList from "../../actions/lifecycle-history-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("lifecycle-history-list: GETs /v1/people/{id}/lifecycle", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [{ id: 1 }] } }, { body: { values: [] } }]);
  const out = await lifecycleHistoryList.execute({ employeeId: "42" }, ctx) as {
    values: unknown[];
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/people/42/lifecycle");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.values.length, 1);
  await lifecycleHistoryList.execute({ employeeId: "42", includeArchived: true }, ctx);
  assertEquals(queryOf(calls[1].url), { includeArchived: "true" });
});

Deno.test("lifecycle-history-list: a 403 points at the missing permission", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "forbidden" } }]);
  let message = "";
  try {
    await lifecycleHistoryList.execute({ employeeId: "42" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("403"), true);
});
