import { assertEquals } from "@std/assert";
import jobList from "../../actions/job-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-list: GET /job/list with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await jobList.execute(
    { "onlyOpen": true, "itemsPerPage": 3 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/job/list");
  assertEquals(queryOf(calls[0].url), { "items_per_page": "3", "only_open": "1" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("job-list: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await jobList.execute({ "onlyOpen": true, "itemsPerPage": 3 } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
