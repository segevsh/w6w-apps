import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, run } from "../_helpers.ts";
import listObjects from "../../actions/list-objects.ts";

test("list-objects: GETs /v2/objects with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ api_slug: "people" }] } }]);
  const out = await run<{ records: unknown[] }>(listObjects, {}, ctx);
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects");
  assertEquals(out.records, [{ api_slug: "people" }]);
  assertEquals(listObjects.params, []);
});

test("list-objects: explains when to prefer a slug and when a UUID", () => {
  const d = listObjects.description!;
  assert(/slug/i.test(d) && /UUID/.test(d), d);
  assert(/mutable/i.test(d), d);
});
