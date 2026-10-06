import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/incident-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("incident-list: full input maps to GET /v1/incidents", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [
        {
          "id": "r1",
          "type": "incidents",
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
    "status": "sample-status",
    "kind": "sample-kind",
    "severity": "sample-severity",
    "severity_id": "sample-severity_id",
    "services": "sample-services",
    "service_ids": "sample-service_ids",
    "teams": "sample-teams",
    "team_ids": "sample-team_ids",
    "environments": "sample-environments",
    "environment_ids": "sample-environment_ids",
    "labels": "sample-labels",
    "user_id": "sample-user_id",
    "created_at_gte": "sample-created_at_gte",
    "created_at_lte": "sample-created_at_lte",
    "started_at_gte": "sample-started_at_gte",
    "resolved_at_gte": "sample-resolved_at_gte",
    "sort": "sample-sort",
    "include": [
      "a1",
      "b2",
    ],
    "page_number": 7,
    "page_size": 7,
    "page_after": "sample-page_after",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/incidents");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.entries()], [
    [
      "filter[search]",
      "sample-search",
    ],
    [
      "filter[status]",
      "sample-status",
    ],
    [
      "filter[kind]",
      "sample-kind",
    ],
    [
      "filter[severity]",
      "sample-severity",
    ],
    [
      "filter[severity_id]",
      "sample-severity_id",
    ],
    [
      "filter[services]",
      "sample-services",
    ],
    [
      "filter[service_ids]",
      "sample-service_ids",
    ],
    [
      "filter[teams]",
      "sample-teams",
    ],
    [
      "filter[team_ids]",
      "sample-team_ids",
    ],
    [
      "filter[environments]",
      "sample-environments",
    ],
    [
      "filter[environment_ids]",
      "sample-environment_ids",
    ],
    [
      "filter[labels]",
      "sample-labels",
    ],
    [
      "filter[user_id]",
      "sample-user_id",
    ],
    [
      "filter[created_at][gte]",
      "sample-created_at_gte",
    ],
    [
      "filter[created_at][lte]",
      "sample-created_at_lte",
    ],
    [
      "filter[started_at][gte]",
      "sample-started_at_gte",
    ],
    [
      "filter[resolved_at][gte]",
      "sample-resolved_at_gte",
    ],
    [
      "sort",
      "sample-sort",
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
        "type": "incidents",
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

Deno.test("incident-list: required input only maps to GET /v1/incidents", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [
        {
          "id": "r1",
          "type": "incidents",
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
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/incidents");
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
        "type": "incidents",
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

Deno.test("incident-list: an API error rejects with the vendor's title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ title: "Resource not found", status: "404", detail: "no such id" }] },
  }]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assertEquals(err.message.includes("HTTP 404"), true);
  assertEquals(err.message.includes("Resource not found: no such id"), true);
});
