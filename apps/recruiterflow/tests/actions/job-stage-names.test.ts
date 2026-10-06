import { assertEquals } from "@std/assert";
import jobStageNames from "../../actions/job-stage-names.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-stage-names: GET /job/stage_names with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await jobStageNames.execute({} as never, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/job/stage_names");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("job-stage-names: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await jobStageNames.execute({} as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
