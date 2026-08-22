import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-create.ts";

Deno.test("board-create: an empty body is valid — nothing is required", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "b1" } }], { display: {} });
  await action.execute!({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("board-create: the policy passes through as parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display: {} });
  await action.execute!({ name: "Retro", policy: '{"sharingPolicy":{"access":"private"}}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Retro",
    policy: { sharingPolicy: { access: "private" } },
  });
});

Deno.test("board-create: bad JSON is named", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ policy: "{oops" }, ctx), Error, "policy");
  assertEquals(calls.length, 0);
});
