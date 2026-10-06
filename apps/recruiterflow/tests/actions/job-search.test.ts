import { assertEquals } from "@std/assert";
import jobSearch from "../../actions/job-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-search: POST /job/search with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await jobSearch.execute(
    { "filters": [{ "key": "job_status" }], "conjunction": "or" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/job/search");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "filters": [{ "key": "job_status" }],
    "conjunction": "or",
    "items_per_page": 20,
    "current_page": 1,
  });
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("job-search: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await jobSearch.execute(
      { "filters": [{ "key": "job_status" }], "conjunction": "or" } as never,
      ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
