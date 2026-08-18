import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/space-create.ts";

const display = { site: "acme" };

Deno.test("space-create: sends the description as a flat {value, representation}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "101" } }], { display });
  await action.execute!({ name: "Engineering", key: "ENG", description: "Team space" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/spaces");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Engineering",
    key: "ENG",
    description: { value: "Team space", representation: "plain" },
  });
});

Deno.test("space-create: private is only sent when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ name: "Secret", createPrivateSpace: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Secret", createPrivateSpace: true });
});

Deno.test("space-create: a name is required before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ name: " " }, ctx), Error, "`name`");
  assertEquals(calls.length, 0);
});
