import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-diagnostics.ts";

test("list-diagnostics: GETs da_checks scoped to SERVER by default", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [{ key: "pixel_missing_param_in_events", title: "Missing parameters" }] } },
  ]);
  const result = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v25.0/1234567890/da_checks");
  assertEquals(url.searchParams.get("connection_method"), "SERVER");
  assertEquals(url.searchParams.get("checks"), null);
  assertEquals(result.data.length, 1);
});

test("list-diagnostics: sends `checks` as a JSON array, as the edge expects a list", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute(
    { connectionMethod: "ALL", checks: "pixel_missing_param_in_events, pixel_decline" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("connection_method"), "ALL");
  assertEquals(
    url.searchParams.get("checks"),
    '["pixel_missing_param_in_events","pixel_decline"]',
  );
});

test("list-diagnostics: honours an explicit dataset id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ datasetId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/42/da_checks");
});

test("list-diagnostics: omits authorization (the runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  assert(!("authorization" in calls[0].headers));
});
