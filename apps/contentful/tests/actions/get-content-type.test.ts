import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-content-type.ts";

test("get-content-type: GETs /content_types/{id}", async () => {
  const body = { sys: { id: "post" }, name: "Post", fields: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { contentTypeId: "post", spaceId: "sp", environmentId: "master" },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).pathname,
    "/spaces/sp/environments/master/content_types/post",
  );
  assertEquals(result, body);
});
