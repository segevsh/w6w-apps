import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/incident-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("incident-create: full input maps to POST /v1/incidents", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "incidents",
        "attributes": {
          "name": "alpha",
        },
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({
    "title": "sample-title",
    "summary": "sample-summary",
    "public_title": "sample-public_title",
    "kind": "test",
    "status": "in_triage",
    "user_id": "sample-user_id",
    "private": true,
    "severity_id": "sample-severity_id",
    "environment_ids": [
      "a1",
      "b2",
    ],
    "incident_type_ids": [
      "a1",
      "b2",
    ],
    "service_ids": [
      "a1",
      "b2",
    ],
    "functionality_ids": [
      "a1",
      "b2",
    ],
    "group_ids": [
      "a1",
      "b2",
    ],
    "cause_ids": [
      "a1",
      "b2",
    ],
    "alert_ids": [
      "a1",
      "b2",
    ],
    "labels": {
      "k": "v",
    },
    "parent_incident_id": "sample-parent_incident_id",
    "duplicate_incident_id": "sample-duplicate_incident_id",
    "notify_emails": [
      "a1",
      "b2",
    ],
    "started_at": "sample-started_at",
    "detected_at": "sample-detected_at",
    "acknowledged_at": "sample-acknowledged_at",
    "mitigated_at": "sample-mitigated_at",
    "resolved_at": "sample-resolved_at",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/incidents");
  assertEquals(calls[0].method, "POST");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "incidents",
      "attributes": {
        "title": "sample-title",
        "summary": "sample-summary",
        "public_title": "sample-public_title",
        "kind": "test",
        "status": "in_triage",
        "user_id": "sample-user_id",
        "private": true,
        "severity_id": "sample-severity_id",
        "environment_ids": [
          "a1",
          "b2",
        ],
        "incident_type_ids": [
          "a1",
          "b2",
        ],
        "service_ids": [
          "a1",
          "b2",
        ],
        "functionality_ids": [
          "a1",
          "b2",
        ],
        "group_ids": [
          "a1",
          "b2",
        ],
        "cause_ids": [
          "a1",
          "b2",
        ],
        "alert_ids": [
          "a1",
          "b2",
        ],
        "labels": {
          "k": "v",
        },
        "parent_incident_id": "sample-parent_incident_id",
        "duplicate_incident_id": "sample-duplicate_incident_id",
        "notify_emails": [
          "a1",
          "b2",
        ],
        "started_at": "sample-started_at",
        "detected_at": "sample-detected_at",
        "acknowledged_at": "sample-acknowledged_at",
        "mitigated_at": "sample-mitigated_at",
        "resolved_at": "sample-resolved_at",
      },
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], "inv-42");
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "incidents",
    },
    "included": [],
  });
});

Deno.test("incident-create: required input only maps to POST /v1/incidents", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "incidents",
        "attributes": {
          "name": "alpha",
        },
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/incidents");
  assertEquals(calls[0].method, "POST");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "incidents",
      "attributes": {},
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], "inv-42");
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "incidents",
    },
    "included": [],
  });
});

Deno.test("incident-create: an API error rejects with the vendor's title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: [{ title: "Resource not found", status: "422", detail: "no such id" }] },
  }]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assertEquals(err.message.includes("HTTP 422"), true);
  assertEquals(err.message.includes("Resource not found: no such id"), true);
});
