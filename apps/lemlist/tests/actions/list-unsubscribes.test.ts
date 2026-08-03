import { assert, assertEquals } from "@std/assert";
import listUnsubscribes from "../../actions/list-unsubscribes.ts";
import { mockCtx, param } from "../_helpers.ts";

/**
 * The legacy `/unsubscribes` routes are marked `deprecated: true` by lemlist and
 * each carries a Warning naming its replacement. This file, and its siblings
 * `add-unsubscribe.test.ts` and `delete-unsubscribe.test.ts`, pin the `/v2/`
 * replacement path so a regression back to the deprecated surface fails loudly.
 */

Deno.test("list-unsubscribes: GETs the v2 variables route, NOT the deprecated /unsubscribes", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listUnsubscribes.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/unsubscribes/variables");
  assert(!/\/api\/unsubscribes/.test(url.pathname), "must not use the deprecated route");
});

Deno.test("list-unsubscribes: forwards offset and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listUnsubscribes.execute!({ offset: 0, limit: 50 }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("offset"), "0");
  assertEquals(p.get("limit"), "50");
});

Deno.test("list-unsubscribes: caps limit at lemlist's documented maximum of 100", () => {
  assertEquals(param(listUnsubscribes, "limit").validation?.max, 100);
});

Deno.test("list-unsubscribes: returns the v2 shape — `value`, not `email`", async () => {
  const body = [{
    _id: "uns_1",
    value: "john.doe@example.com",
    source: "user",
    createdAt: "2023-06-12T10:45:21.367Z",
  }];
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await listUnsubscribes.execute!({}, ctx), body);
});
