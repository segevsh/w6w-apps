import { assertEquals, assertRejects } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { errorsBody, mockCtx, pathOf, queryOf, single } from "../_helpers.ts";

Deno.test("account-get: GET /accounts/{id} returns the resource and included", async () => {
  const { ctx, calls } = mockCtx([{
    body: { ...single("account", 42, { name: "x" }), included: [{ type: "user", id: 1 }] },
  }]);
  const out = await accountGet.execute({ id: 42 }, ctx) as {
    data: { id: number };
    included: unknown[];
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/42");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(out.data.id, 42);
  assertEquals(out.included.length, 1);
});

Deno.test("account-get: include and sparse fields are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: single("account", 1) }]);
  await accountGet.execute({ id: "1", include: "owner", fields: "name" }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "owner", "fields[account]": "name" });
});

Deno.test("account-get: a non-integer id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await accountGet.execute({ id: "../users" }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});

Deno.test("account-get: 404 resourceNotFound is reported", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorsBody("resourceNotFound", "Resource Not Found", "Could not find it."),
  }]);
  await assertRejects(
    async () => await accountGet.execute({ id: 9 }, ctx),
    Error,
    "resourceNotFound",
  );
});
