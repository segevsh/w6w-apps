import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/enrich-combined.ts";

Deno.test("enrich-combined: GETs person-stream.clearbit.com/v2/combined/find?email=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { person: { id: "p1" }, company: { id: "c1" } } }]);
  const result = await action.execute!({ email: "alex@clearbit.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://person-stream.clearbit.com/v2/combined/find?email=alex%40clearbit.com",
  );
  assertEquals(result, { person: { id: "p1" }, company: { id: "c1" } });
});

Deno.test("enrich-combined: optional fields map to snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { email: "alex@clearbit.com", givenName: "Alex", familyName: "MacCaw", ipAddress: "1.2.3.4" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("given_name"), "Alex");
  assertEquals(url.searchParams.get("family_name"), "MacCaw");
  assertEquals(url.searchParams.get("ip_address"), "1.2.3.4");
});

Deno.test("enrich-combined: requires email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ email: "" }, ctx), Error, "email");
  assertEquals(calls.length, 0);
});
