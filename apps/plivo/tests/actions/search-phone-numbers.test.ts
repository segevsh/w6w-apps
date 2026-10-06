import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, mockCtx } from "../_helpers.ts";
import action from "../../actions/search-phone-numbers.ts";

Deno.test("search-phone-numbers: sends only the filters that were set, under the documented names", async () => {
  const body = {
    api_id: "a",
    meta: { limit: 5, offset: 0, total_count: 0, next: null },
    objects: [],
  };
  const { ctx, calls } = mockCtx([{ body }], CONN);
  const out = await action.execute!({
    countryIso: "US",
    type: "local",
    pattern: "415",
    services: "voice,sms",
    city: "SAN FRANCISCO",
    npanxx: 415555,
    lata: 722,
    rateCenter: "SNFC CNTRL",
    region: "x",
    limit: 5,
    offset: 5,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, BASE + "PhoneNumber/");
  assertEquals(Object.fromEntries(u.searchParams), {
    country_iso: "US",
    type: "local",
    pattern: "415",
    services: "voice,sms",
    region: "x",
    city: "SAN FRANCISCO",
    npanxx: "415555",
    lata: "722",
    rate_center: "SNFC CNTRL",
    limit: "5",
    offset: "5",
  });
  assertEquals(out, body);
});

Deno.test("search-phone-numbers: only the required country means a one-parameter query", async () => {
  const { ctx, calls } = mockCtx([{ body: { objects: [] } }], CONN);
  await action.execute!({ countryIso: "US" }, ctx);
  assertEquals(calls[0].url, BASE + "PhoneNumber/?country_iso=US");
});

Deno.test("search-phone-numbers: a 401 plain-text body is thrown with its text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Could not verify your access level" }], CONN);
  await assertRejects(
    async () => await action.execute!({ countryIso: "US" }, ctx),
    Error,
    "Could not verify your access level",
  );
});
