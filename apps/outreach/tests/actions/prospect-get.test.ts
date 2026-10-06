import { assertEquals, assertRejects } from "@std/assert";
import prospectGet from "../../actions/prospect-get.ts";
import { errorsBody, mockCtx, pathOf, queryOf, single } from "../_helpers.ts";

Deno.test("prospect-get: GET /prospects/{id} returns the resource and included", async () => {
  const { ctx, calls } = mockCtx([{
    body: { ...single("prospect", 42, { name: "x" }), included: [{ type: "user", id: 1 }] },
  }]);
  const out = await prospectGet.execute({ id: 42 }, ctx) as {
    data: { id: number };
    included: unknown[];
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/prospects/42");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(out.data.id, 42);
  assertEquals(out.included.length, 1);
});

Deno.test("prospect-get: include and sparse fields are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: single("prospect", 1) }]);
  await prospectGet.execute({ id: "1", include: "owner", fields: "name" }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "owner", "fields[prospect]": "name" });
});

Deno.test("prospect-get: a non-integer id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await prospectGet.execute({ id: "../users" }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});

Deno.test("prospect-get: 404 resourceNotFound is reported", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorsBody("resourceNotFound", "Resource Not Found", "Could not find it."),
  }]);
  await assertRejects(
    async () => await prospectGet.execute({ id: 9 }, ctx),
    Error,
    "resourceNotFound",
  );
});
