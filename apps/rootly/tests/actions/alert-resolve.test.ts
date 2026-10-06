import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/alert-resolve.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("alert-resolve: full input maps to POST /v1/alerts/{id}/resolve", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "alerts",
        "attributes": {
          "name": "alpha",
        },
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({
    "id": "id-1",
    "resolution_message": "sample-resolution_message",
    "resolve_related_incidents": true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/alerts/id-1/resolve");
  assertEquals(calls[0].method, "POST");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "alerts",
      "attributes": {
        "resolution_message": "sample-resolution_message",
        "resolve_related_incidents": true,
      },
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "alerts",
    },
    "included": [],
  });
});

Deno.test("alert-resolve: required input only maps to POST /v1/alerts/{id}/resolve", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "alerts",
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
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/alerts/id-1/resolve");
  assertEquals(calls[0].method, "POST");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "alerts",
      "attributes": {},
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "alerts",
    },
    "included": [],
  });
});

Deno.test("alert-resolve: an API error rejects with the vendor's title and detail", async () => {
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
