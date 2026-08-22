import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usage-fields-list.ts";

const display = { projectId: "proj_1" };

Deno.test("usage-fields-list: reads the dimensions a report can group by", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { tags: ["support"], models: [], features: [] } }],
    { display },
  );
  const result = await action.execute!({}, ctx) as { tags: string[] };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.deepgram.com/v1/projects/proj_1/usage/fields",
  );
  assertEquals(result.tags, ["support"]);
});

Deno.test("usage-fields-list: dates are narrowed to what Deepgram accepts", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ start: "2026-08-01T09:30:00Z", end: "2026-08-18" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("start"), "2026-08-01");
  assertEquals(q.get("end"), "2026-08-18");
});

/** A tag exists because a request carried it — nothing configures them. */
Deno.test("usage-fields-list: says why tags cannot simply be looked up", () => {
  assert(/not configured anywhere/.test(action.description!), action.description);
});
