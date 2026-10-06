import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/severity-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("severity-list: full input maps to GET /v1/severities", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [
        {
          "id": "r1",
          "type": "severities",
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
    "search": "sample-search",
    "name": "sample-name",
    "slug": "sample-slug",
    "severity": "sample-severity",
    "color": "sample-color",
    "sort": "sample-sort",
    "page_number": 7,
    "page_size": 7,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/severities");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.entries()], [
    [
      "filter[search]",
      "sample-search",
    ],
    [
      "filter[name]",
      "sample-name",
    ],
    [
      "filter[slug]",
      "sample-slug",
    ],
    [
      "filter[severity]",
      "sample-severity",
    ],
    [
      "filter[color]",
      "sample-color",
    ],
    [
      "sort",
      "sample-sort",
    ],
    [
      "page[number]",
      "7",
    ],
    [
      "page[size]",
      "7",
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
        "type": "severities",
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

Deno.test("severity-list: required input only maps to GET /v1/severities", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [
        {
          "id": "r1",
          "type": "severities",
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
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/severities");
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
        "type": "severities",
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

Deno.test("severity-list: an API error rejects with the vendor's title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ title: "Resource not found", status: "404", detail: "no such id" }] },
  }]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assertEquals(err.message.includes("HTTP 404"), true);
  assertEquals(err.message.includes("Resource not found: no such id"), true);
});
