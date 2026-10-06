import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/user-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-get: full input maps to GET /v1/users/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "users",
        "attributes": {
          "name": "alpha",
        },
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({
    "id": "id-1",
    "include": [
      "a1",
      "b2",
    ],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/users/id-1");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.entries()], [
    [
      "include",
      "a1,b2",
    ],
  ]);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "users",
    },
    "included": [],
  });
});

Deno.test("user-get: required input only maps to GET /v1/users/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "users",
        "attributes": {
          "name": "alpha",
        },
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({
    "id": "id-1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/users/id-1");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "users",
    },
    "included": [],
  });
});

Deno.test("user-get: an API error rejects with the vendor's title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ title: "Resource not found", status: "404", detail: "no such id" }] },
  }]);
  const err = await assertRejects(async () =>
    await action.execute!({
      "id": "id-1",
    }, ctx), Error);
  assertEquals(err.message.includes("HTTP 404"), true);
  assertEquals(err.message.includes("Resource not found: no such id"), true);
});
