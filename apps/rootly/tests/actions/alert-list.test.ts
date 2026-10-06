import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/alert-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("alert-list: full input maps to GET /v1/alerts", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [
        {
          "id": "r1",
          "type": "alerts",
          "attributes": {
            "name": "alpha",
          },
        },
      ],
      "included": [
        {
          "id": "i1",
          "type": "users",
          "attributes": {
            "email": "a@b.co",
          },
        },
      ],
      "meta": {
        "total_count": 1,
        "current_page": 1,
      },
      "links": {
        "self": "x",
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({
    "status": "sample-status",
    "source": "sample-source",
    "services": "sample-services",
    "environments": "sample-environments",
    "groups": "sample-groups",
    "labels": "sample-labels",
    "include": [
      "a1",
      "b2",
    ],
    "page_number": 7,
    "page_size": 7,
    "page_after": "sample-page_after",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/alerts");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.entries()], [
    [
      "filter[status]",
      "sample-status",
    ],
    [
      "filter[source]",
      "sample-source",
    ],
    [
      "filter[services]",
      "sample-services",
    ],
    [
      "filter[environments]",
      "sample-environments",
    ],
    [
      "filter[groups]",
      "sample-groups",
    ],
    [
      "filter[labels]",
      "sample-labels",
    ],
    [
      "include",
      "a1,b2",
    ],
    [
      "page[number]",
      "7",
    ],
    [
      "page[size]",
      "7",
    ],
    [
      "page[after]",
      "sample-page_after",
    ],
  ]);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "items": [
      {
        "name": "alpha",
        "id": "r1",
        "type": "alerts",
      },
    ],
    "included": [
      {
        "email": "a@b.co",
        "id": "i1",
        "type": "users",
      },
    ],
    "meta": {
      "total_count": 1,
      "current_page": 1,
    },
    "links": {
      "self": "x",
    },
  });
});

Deno.test("alert-list: required input only maps to GET /v1/alerts", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [
        {
          "id": "r1",
          "type": "alerts",
          "attributes": {
            "name": "alpha",
          },
        },
      ],
      "included": [
        {
          "id": "i1",
          "type": "users",
          "attributes": {
            "email": "a@b.co",
          },
        },
      ],
      "meta": {
        "total_count": 1,
        "current_page": 1,
      },
      "links": {
        "self": "x",
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/alerts");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "items": [
      {
        "name": "alpha",
        "id": "r1",
        "type": "alerts",
      },
    ],
    "included": [
      {
        "email": "a@b.co",
        "id": "i1",
        "type": "users",
      },
    ],
    "meta": {
      "total_count": 1,
      "current_page": 1,
    },
    "links": {
      "self": "x",
    },
  });
});

Deno.test("alert-list: an API error rejects with the vendor's title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ title: "Resource not found", status: "404", detail: "no such id" }] },
  }]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assertEquals(err.message.includes("HTTP 404"), true);
  assertEquals(err.message.includes("Resource not found: no such id"), true);
});
