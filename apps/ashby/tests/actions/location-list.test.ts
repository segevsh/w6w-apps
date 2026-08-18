import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/location-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

/** Without the hierarchy a regional report has to hard-code its cities. */
Deno.test("location-list: asks for the region hierarchy by default", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "l1" }])]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.ashbyhq.com/location.list");
  assertEquals(JSON.parse(calls[0].body!).includeLocationHierarchy, true);
});

Deno.test("location-list: the hierarchy can be turned off", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ includeLocationHierarchy: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeLocationHierarchy, false);
});

Deno.test("location-list: archived locations are opt-in", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ includeArchived: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).includeArchived, true);
});

Deno.test("location-list: says why the hierarchy matters", () => {
  assert(/EMEA/.test(action.description!), action.description);
});
