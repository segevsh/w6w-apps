import { assertEquals, assertRejects } from "@std/assert";
import sequenceGet from "../../actions/sequence-get.ts";
import { errorsBody, mockCtx, pathOf, queryOf, single } from "../_helpers.ts";

Deno.test("sequence-get: GET /sequences/{id} returns the resource and included", async () => {
  const { ctx, calls } = mockCtx([{
    body: { ...single("sequence", 42, { name: "x" }), included: [{ type: "user", id: 1 }] },
  }]);
  const out = await sequenceGet.execute({ id: 42 }, ctx) as {
    data: { id: number };
    included: unknown[];
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/sequences/42");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(out.data.id, 42);
  assertEquals(out.included.length, 1);
});

Deno.test("sequence-get: include and sparse fields are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: single("sequence", 1) }]);
  await sequenceGet.execute({ id: "1", include: "owner", fields: "name" }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "owner", "fields[sequence]": "name" });
});

Deno.test("sequence-get: a non-integer id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await sequenceGet.execute({ id: "../users" }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});

Deno.test("sequence-get: 404 resourceNotFound is reported", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorsBody("resourceNotFound", "Resource Not Found", "Could not find it."),
  }]);
  await assertRejects(
    async () => await sequenceGet.execute({ id: 9 }, ctx),
    Error,
    "resourceNotFound",
  );
});
