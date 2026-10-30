import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import newsletterGet from "../../actions/newsletter-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("newsletter-get: fetches /api/mailing/newsletters/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, type: "regular" } }]);
  const out = await newsletterGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mailing/newsletters/1");
  assertEquals(out, { id: 1, type: "regular" });
});
