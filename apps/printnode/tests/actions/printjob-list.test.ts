import { assertEquals, assertRejects } from "@std/assert";
import printjobList from "../../actions/printjob-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("printjob-list: GET /printjobs with pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 473 }] }]);
  const out = await printjobList.execute({ limit: 20, after: 123456, dir: "asc" }, ctx);
  assertEquals(pathOf(calls[0].url), "/printjobs");
  assertEquals(queryOf(calls[0].url), { limit: "20", after: "123456", dir: "asc" });
  assertEquals(out, { items: [{ id: 473 }], count: 1 });
});

Deno.test("printjob-list: printer ids scope the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await printjobList.execute({ printerIds: "34,36" }, ctx);
  assertEquals(pathOf(calls[0].url), "/printers/34,36/printjobs");
});

Deno.test("printjob-list: bad printer ids refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await printjobList.execute({ printerIds: "0" }, ctx), Error);
});
