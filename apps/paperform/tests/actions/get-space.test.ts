import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import getSpace from "../../actions/get-space.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("get-space: GETs /v1/spaces/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ space: { id: "sp1" } }) }]);
  const out = await getSpace.execute({ id: "sp1" }, ctx) as { space?: { id?: string } };
  assertEquals(pathOf(calls[0].url), "/v1/spaces/sp1");
  assertEquals(out.space?.id, "sp1");
});
