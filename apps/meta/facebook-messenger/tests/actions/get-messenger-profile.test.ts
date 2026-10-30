import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-messenger-profile.ts";

test("get-messenger-profile: GET /me/messenger_profile?fields=…", async () => {
  const body = { data: [{ greeting: [{ locale: "default", text: "Hello!" }] }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({ fields: "greeting" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v26.0/me/messenger_profile");
  assertEquals(url.searchParams.get("fields"), "greeting");
  assertEquals(out, body);
});

test("get-messenger-profile: fields are required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ fields: "" }, ctx), Error, "fields");
  assertEquals(calls.length, 0);
});
