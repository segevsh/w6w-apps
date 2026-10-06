import { assertEquals } from "@std/assert";
import action from "../../actions/find-phone.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("find-phone: POSTs the profile and wraps the response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "phone": "+33 6 12 34 56 78" } }]);
  const out = await action.execute!({ "linkedin_url": "johndoe" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/search/phone");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "linkedin_url": "johndoe",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "result": { "phone": "+33 6 12 34 56 78" } });
});
