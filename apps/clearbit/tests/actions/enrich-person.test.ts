import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/enrich-person.ts";

Deno.test("enrich-person: GETs person-stream.clearbit.com/v2/people/find?email=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", email: "alex@clearbit.com" } }]);
  const result = await action.execute!({ email: "alex@clearbit.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://person-stream.clearbit.com/v2/people/find?email=alex%40clearbit.com",
  );
  assertEquals(result, { id: "p1", email: "alex@clearbit.com" });
});

Deno.test("enrich-person: optional match-quality fields map to snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      email: "alex@clearbit.com",
      givenName: "Alex",
      familyName: "MacCaw",
      company: "Clearbit",
      companyDomain: "clearbit.com",
      ipAddress: "1.2.3.4",
      location: "San Francisco",
      linkedin: "alexmaccaw",
      twitter: "maccaw",
      facebook: "amaccaw",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("given_name"), "Alex");
  assertEquals(url.searchParams.get("family_name"), "MacCaw");
  assertEquals(url.searchParams.get("company"), "Clearbit");
  assertEquals(url.searchParams.get("company_domain"), "clearbit.com");
  assertEquals(url.searchParams.get("ip_address"), "1.2.3.4");
  assertEquals(url.searchParams.get("location"), "San Francisco");
  assertEquals(url.searchParams.get("linkedin"), "alexmaccaw");
  assertEquals(url.searchParams.get("twitter"), "maccaw");
  assertEquals(url.searchParams.get("facebook"), "amaccaw");
});

Deno.test("enrich-person: requires email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ email: "" }, ctx), Error, "email");
  assertEquals(calls.length, 0);
});
