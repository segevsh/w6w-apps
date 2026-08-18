import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

Deno.test("organization-list: needs no org on the connection", async () => {
  // The one action that works before a slug is known — it is how you find one.
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ slug: "acme" }] }], {
    display: { endpoint: "https://us.sentry.io" },
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/0/organizations/");
  assertEquals(result, [{ slug: "acme" }]);
});

Deno.test("organization-list: owner is only sent when asked for", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }, { status: 200, body: [] }], {
    display: {},
  });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("owner"), null);
  await action.execute!({ owner: true, query: "ac" }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("owner"), "true");
  assertEquals(new URL(calls[1].url).searchParams.get("query"), "ac");
});
