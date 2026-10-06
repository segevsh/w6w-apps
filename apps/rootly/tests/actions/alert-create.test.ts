import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/alert-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("alert-create: full input maps to POST /v1/alerts", async () => {
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
    "summary": "sample-summary",
    "source": "sample-source",
    "description": "sample-description",
    "status": "open",
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
    "notification_target_type": "User",
    "notification_target_id": "sample-notification_target_id",
    "labels": {
      "k": "v",
    },
    "data": {
      "k": "v",
    },
    "deduplication_key": "sample-deduplication_key",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/alerts");
  assertEquals(calls[0].method, "POST");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "alerts",
      "attributes": {
        "summary": "sample-summary",
        "source": "sample-source",
        "description": "sample-description",
        "status": "open",
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
        "notification_target_type": "User",
        "notification_target_id": "sample-notification_target_id",
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

Deno.test("alert-create: required input only maps to POST /v1/alerts", async () => {
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
    "summary": "sample-summary",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/alerts");
  assertEquals(calls[0].method, "POST");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "alerts",
      "attributes": {
        "summary": "sample-summary",
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

Deno.test("alert-create: an API error rejects with the vendor's title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: [{ title: "Resource not found", status: "422", detail: "no such id" }] },
  }]);
  const err = await assertRejects(async () =>
    await action.execute!({
      "summary": "sample-summary",
    }, ctx), Error);
  assertEquals(err.message.includes("HTTP 422"), true);
  assertEquals(err.message.includes("Resource not found: no such id"), true);
});
