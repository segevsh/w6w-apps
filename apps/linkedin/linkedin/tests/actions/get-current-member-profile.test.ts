import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-current-member-profile.ts";

Deno.test("get-current-member-profile: GETs /v2/userinfo and returns the parsed profile", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { sub: "abc123", name: "Ada Lovelace", email: "ada@example.com" } },
  ]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "api.linkedin.com");
  assertEquals(url.pathname, "/v2/userinfo");
  assertEquals((out as { sub: string }).sub, "abc123");
  assertEquals((out as { email: string }).email, "ada@example.com");
});

Deno.test("get-current-member-profile: throws a descriptive error on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "401");
});
