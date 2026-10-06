import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/alert-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("alert-update: full input maps to PATCH /v1/alerts/{id}", async () => {
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
    "summary": "sample-summary",
    "source": "sample-source",
    "description": "sample-description",
    "noise": "noise",
    "service_ids": [
      "a1",
      "b2",
    ],
    "group_ids": [
      "a1",
      "b2",
    ],
    "functionality_ids": [
      "a1",
      "b2",
    ],
    "environment_ids": [
      "a1",
      "b2",
    ],
    "started_at": "sample-started_at",
    "ended_at": "sample-ended_at",
    "external_id": "sample-external_id",
    "external_url": "sample-external_url",
    "alert_urgency_id": "sample-alert_urgency_id",
    "labels": {
      "k": "v",
    },
    "data": {
      "k": "v",
    },
    "deduplication_key": "sample-deduplication_key",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/alerts/id-1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "alerts",
      "id": "id-1",
      "attributes": {
        "summary": "sample-summary",
        "source": "sample-source",
        "description": "sample-description",
        "noise": "noise",
        "service_ids": [
          "a1",
          "b2",
        ],
        "group_ids": [
          "a1",
          "b2",
        ],
        "functionality_ids": [
          "a1",
          "b2",
        ],
        "environment_ids": [
          "a1",
          "b2",
        ],
        "started_at": "sample-started_at",
        "ended_at": "sample-ended_at",
        "external_id": "sample-external_id",
        "external_url": "sample-external_url",
        "alert_urgency_id": "sample-alert_urgency_id",
        "labels": {
          "k": "v",
        },
        "data": {
          "k": "v",
        },
        "deduplication_key": "sample-deduplication_key",
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

Deno.test("alert-update: required input only maps to PATCH /v1/alerts/{id}", async () => {
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
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/alerts/id-1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "alerts",
      "id": "id-1",
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

Deno.test("alert-update: an API error rejects with the vendor's title and detail", async () => {
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
