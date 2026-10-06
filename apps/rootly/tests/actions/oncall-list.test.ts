import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/oncall-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("oncall-list: full input maps to GET /v1/oncalls", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [
        {
          "id": "r1",
          "type": "oncalls",
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
    "since": "sample-since",
    "until": "sample-until",
    "earliest": true,
    "time_zone": "sample-time_zone",
    "schedule_ids": "sample-schedule_ids",
    "escalation_policy_ids": "sample-escalation_policy_ids",
    "user_ids": "sample-user_ids",
    "service_ids": "sample-service_ids",
    "group_ids": "sample-group_ids",
    "include": [
      "a1",
      "b2",
    ],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/oncalls");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.entries()], [
    [
      "since",
      "sample-since",
    ],
    [
      "until",
      "sample-until",
    ],
    [
      "earliest",
      "true",
    ],
    [
      "time_zone",
      "sample-time_zone",
    ],
    [
      "filter[schedule_ids]",
      "sample-schedule_ids",
    ],
    [
      "filter[escalation_policy_ids]",
      "sample-escalation_policy_ids",
    ],
    [
      "filter[user_ids]",
      "sample-user_ids",
    ],
    [
      "filter[service_ids]",
      "sample-service_ids",
    ],
    [
      "filter[group_ids]",
      "sample-group_ids",
    ],
    [
      "include",
      "a1,b2",
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
        "type": "oncalls",
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

Deno.test("oncall-list: required input only maps to GET /v1/oncalls", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [
        {
          "id": "r1",
          "type": "oncalls",
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
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/oncalls");
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
        "type": "oncalls",
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

Deno.test("oncall-list: an API error rejects with the vendor's title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ title: "Resource not found", status: "404", detail: "no such id" }] },
  }]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assertEquals(err.message.includes("HTTP 404"), true);
  assertEquals(err.message.includes("Resource not found: no such id"), true);
});
