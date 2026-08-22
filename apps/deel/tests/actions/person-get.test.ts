import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-get.ts";

Deno.test("person-get: takes the HRIS profile id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], { display: {} });
  await action.execute!({ hrisProfileId: "hp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/people/hp1");
});

Deno.test("person-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`hrisProfileId`");
  assertEquals(calls.length, 0);
});
