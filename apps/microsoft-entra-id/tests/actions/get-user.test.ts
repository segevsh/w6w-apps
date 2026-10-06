import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user.ts";

Deno.test("get-user: GETs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", displayName: "A" } }]);
  const out = await action.execute({ userId: "u1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/users/u1");
  assertEquals(out.id, "u1");
});

Deno.test("get-user: a UPN keeps its @ and a B2B # is encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ userId: "Adele_adatum.com#EXT#@contoso.com" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/users/Adele_adatum.com%23EXT%23@contoso.com",
  );
});

Deno.test("get-user: a $-leading UPN uses the users('…') form", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ userId: "$x@y.com" }, ctx);
  assertEquals(decodeURIComponent(new URL(calls[0].url).pathname), "/v1.0/users('$x@y.com')");
});

Deno.test("get-user: passes $select", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ userId: "u1", select: ["id", "city"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "id,city");
});

Deno.test("get-user: a 404 surfaces Graph's error code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: "Request_ResourceNotFound", message: "missing" } },
  }]);
  await assertRejects(
    async () => await action.execute({ userId: "nope" }, ctx),
    Error,
    "Request_ResourceNotFound",
  );
});
