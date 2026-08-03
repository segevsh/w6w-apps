import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/get-current-user.ts";

Deno.test("get-current-user: is a read whose every param is optional", () => {
  assertEquals(action.key, "get-current-user");
  assertEquals(action.type, "read");
  for (const p of action.params ?? []) assert(!p.required, `${p.key} should be optional`);
});

Deno.test("get-current-user: GETs /users/me", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, email: "a@b.com" } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/users/me");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-current-user: offers the operation's only include value", () => {
  assertEquals(optionValues(action, "include"), ["groups"]);
});

Deno.test("get-current-user: sends include when asked", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ include: ["groups"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "groups");
});

Deno.test("get-current-user: is NOT tagged as a health check, so the surface has one entry", async () => {
  // The runtime already derives `auth:access-token` from the same probe.
  assertEquals(action.healthCheck, undefined);
  const src = await Deno.readTextFile(
    new URL("../../actions/get-current-user.ts", import.meta.url),
  );
  assert(/auth:access-token/.test(src));
});

Deno.test("get-current-user: returns the user payload unchanged", async () => {
  const body = { id: 2977496047981956, email: "a@b.com", firstName: "A", lastName: "B" };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({}, ctx), body);
});
