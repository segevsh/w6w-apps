import { assertEquals } from "@std/assert";
import jobCount from "../../actions/job-count.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-count: GET /job/count with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await jobCount.execute(
    { "onlyOpen": true, "departments": "1,2" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/job/count");
  assertEquals(queryOf(calls[0].url), { "only_open": "1", "departments": "1,2" });
  assertEquals(calls[0].body, null);
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("job-count: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await jobCount.execute({ "onlyOpen": true, "departments": "1,2" } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
