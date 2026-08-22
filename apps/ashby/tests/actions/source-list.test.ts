import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/source-list.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("source-list: reads the sources, excluding archived by default", async () => {
  const { ctx, calls } = mockCtx([ok([{ id: "src1", title: "Referral" }])]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/source.list");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(result.count, 1);
});

Deno.test("source-list: archived sources are opt-in", async () => {
  const { ctx, calls } = mockCtx([ok([])]);
  await action.execute!({ includeArchived: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeArchived, true);
});

/** A workflow that cannot find its source sends none, and that is unrecoverable. */
Deno.test("source-list: says to create the source in Ashby first", () => {
  assert(/Create the source in/.test(action.description!), action.description);
});
