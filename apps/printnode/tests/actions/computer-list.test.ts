import { assertEquals } from "@std/assert";
import computerList from "../../actions/computer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("computer-list: GET /computers with pagination and total header", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: 12 }],
    headers: { "content-type": "application/json", "records-total": "3" },
  }]);
  const out = await computerList.execute({ limit: 1, after: 20, dir: "asc" }, ctx);
  assertEquals(pathOf(calls[0].url), "/computers");
  assertEquals(queryOf(calls[0].url), { limit: "1", after: "20", dir: "asc" });
  assertEquals(out, { items: [{ id: 12 }], count: 1, total: 3 });
});

Deno.test("computer-list: an unknown dir is not forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await computerList.execute({ dir: "sideways" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
