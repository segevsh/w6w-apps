import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/link-get.ts";

test("link-get: GETs /v1/links/<id>", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { path: "/a", type: "file" } }]);
  assertEquals(await action.execute({ linkId: "a/b" }, ctx), { path: "/a", type: "file" });
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/links/a%2Fb");
});
