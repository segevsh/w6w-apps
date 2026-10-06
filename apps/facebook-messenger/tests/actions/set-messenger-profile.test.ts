import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/set-messenger-profile.ts";

Deno.test("set-messenger-profile: POSTs the properties as the JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" } }]);
  const props = {
    get_started: { payload: "GET_STARTED" },
    whitelisted_domains: ["https://x.com/"],
  };
  const out = await action.execute!({ properties: props }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/me/messenger_profile");
  assertEquals(bodyOf(calls[0]), props);
  assertEquals(out, { result: "success" });
});

Deno.test("set-messenger-profile: accepts a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" } }]);
  await action.execute!({ properties: '{"account_linking_url":"https://x.com/l"}' }, ctx);
  assertEquals(bodyOf(calls[0]), { account_linking_url: "https://x.com/l" });
});

Deno.test("set-messenger-profile: empty, array or non-object properties are rejected locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ properties: {} }, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await action.execute!({ properties: [1] }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});

Deno.test("set-messenger-profile: idempotent", () => {
  assertEquals(action.idempotent, true);
});
