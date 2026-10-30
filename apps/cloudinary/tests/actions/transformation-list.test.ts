import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transformation-list.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

test("transformation-list: can filter down to named definitions", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { transformations: [] } }], conn);
  await action.execute!({ named: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("named"), "true");
});

test("transformation-list: unfiltered, it includes URL-generated entries", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { transformations: [] } }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("named"), null);
});
