import { assertEquals, assertRejects } from "@std/assert";
import pageGet from "../../actions/page-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("page-get: GET /pages/{id} flattens the resource", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "pages", "attributes": { "name": "x" } } },
  }]);
  const out = await pageGet.execute({ id: "42", include: "project" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/pages/42");
  assertEquals(queryOf(calls[0].url), { include: "project" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(out.id, "42");
  assertEquals(out.type, "pages");
  assertEquals(out.name, "x");
});

Deno.test("page-get: an id cannot change the path", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "pages", "attributes": { "name": "x" } } },
  }]);
  await pageGet.execute({ id: "4/../x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname.startsWith("/api/v2/pages/"), true);
  assertEquals(pathOf(calls[0].url), "/api/v2/pages/4%2F..%2Fx");
});

Deno.test("page-get: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(pageGet.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("page-get: declares read", () => {
  assertEquals(pageGet.type, "read");
  assertEquals(pageGet.idempotent, undefined);
  assertEquals(pageGet.key, "page-get");
});
