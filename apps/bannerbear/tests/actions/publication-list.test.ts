import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import publicationList from "../../actions/publication-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("publication-list: GET /publications", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "p1", visibility: "public_library" }] }]);
  const out = await publicationList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/publications");
  assertEquals(out, [{ uid: "p1", visibility: "public_library" }]);
});
