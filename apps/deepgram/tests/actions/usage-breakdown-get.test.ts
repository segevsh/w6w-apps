import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usage-breakdown-get.ts";

const display = { projectId: "proj_1" };
const ok = { status: 200, body: { results: [] } };

Deno.test("usage-breakdown-get: groups by model by default", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({}, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.deepgram.com/v1/projects/proj_1/usage/breakdown",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("grouping"), "model");
});

/** Grouping by API key finds the integration nobody remembers deploying. */
Deno.test("usage-breakdown-get: every grouping reaches the wire", async () => {
  for (const grouping of ["tag", "endpoint", "accessor"]) {
    const { ctx, calls } = mockCtx([ok], { display });
    await action.execute!({ grouping }, ctx);
    assertEquals(new URL(calls[0].url).searchParams.get("grouping"), grouping, grouping);
  }
});

Deno.test("usage-breakdown-get: dates are narrowed to what Deepgram accepts", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({ start: "2026-08-01T00:00:00Z" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("start"), "2026-08-01");
});

Deno.test("usage-breakdown-get: says what it adds over the plain total", () => {
  assert(/act on/.test(action.description!), action.description);
});
