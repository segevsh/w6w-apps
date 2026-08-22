import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-group-create.ts";

const display = { display: { region: "us" } };

Deno.test("user-group-create: POSTs to the V2 base", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "g1" } }], display);
  await action.execute!({ name: "Engineering", description: "eng" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/usergroups");
  assertEquals(JSON.parse(calls[0].body!), { name: "Engineering", description: "eng" });
});

/** A memberQuery is what makes the group dynamic, so it is an explicit choice. */
Deno.test("user-group-create: a member query is passed through as an object", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({
    name: "Engineering",
    memberQuery: '{"queryType":"FilterQuery","filters":[' +
      '{"field":"department","operator":"eq","value":"Engineering"}]}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).memberQuery.queryType, "FilterQuery");
  assertEquals((logs[0].data as { dynamic: boolean }).dynamic, true);
});

Deno.test("user-group-create: without a query it is static", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({ name: "Engineering" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).memberQuery, undefined);
  assertEquals((logs[0].data as { dynamic: boolean }).dynamic, false);
});

Deno.test("user-group-create: a name is required, and duplicates are possible", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`name` is required");
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});
