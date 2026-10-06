import { assertEquals, assertRejects } from "@std/assert";
import serviceGet from "../../actions/service-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("service-get: GET /services/{id} flattens the resource", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "services", "attributes": { "name": "x" } } },
  }]);
  const out = await serviceGet.execute({ id: "42", include: "project" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/services/42");
  assertEquals(queryOf(calls[0].url), { include: "project" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(out.id, "42");
  assertEquals(out.type, "services");
  assertEquals(out.name, "x");
});

Deno.test("service-get: an id cannot change the path", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "services", "attributes": { "name": "x" } } },
  }]);
  await serviceGet.execute({ id: "4/../x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname.startsWith("/api/v2/services/"), true);
  assertEquals(pathOf(calls[0].url), "/api/v2/services/4%2F..%2Fx");
});

Deno.test("service-get: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(serviceGet.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("service-get: declares read", () => {
  assertEquals(serviceGet.type, "read");
  assertEquals(serviceGet.idempotent, undefined);
  assertEquals(serviceGet.key, "service-get");
});
