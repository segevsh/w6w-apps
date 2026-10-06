import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/incident-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("incident-update: full input maps to PUT /v1/incidents/{id}", async () => {
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
    "id": "id-1",
    "title": "sample-title",
    "summary": "sample-summary",
    "public_title": "sample-public_title",
    "kind": "test",
    "status": "in_triage",
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
    "started_at": "sample-started_at",
    "detected_at": "sample-detected_at",
    "acknowledged_at": "sample-acknowledged_at",
    "mitigated_at": "sample-mitigated_at",
    "resolved_at": "sample-resolved_at",
    "mitigation_message": "sample-mitigation_message",
    "resolution_message": "sample-resolution_message",
    "cancellation_message": "sample-cancellation_message",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/incidents/id-1");
  assertEquals(calls[0].method, "PUT");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "incidents",
      "id": "id-1",
      "attributes": {
        "title": "sample-title",
        "summary": "sample-summary",
        "public_title": "sample-public_title",
        "kind": "test",
        "status": "in_triage",
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
        "started_at": "sample-started_at",
        "detected_at": "sample-detected_at",
        "acknowledged_at": "sample-acknowledged_at",
        "mitigated_at": "sample-mitigated_at",
        "resolved_at": "sample-resolved_at",
        "mitigation_message": "sample-mitigation_message",
        "resolution_message": "sample-resolution_message",
        "cancellation_message": "sample-cancellation_message",
      },
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "incidents",
    },
    "included": [],
  });
});

Deno.test("incident-update: required input only maps to PUT /v1/incidents/{id}", async () => {
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
    "id": "id-1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/incidents/id-1");
  assertEquals(calls[0].method, "PUT");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "incidents",
      "id": "id-1",
      "attributes": {},
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "incidents",
    },
    "included": [],
  });
});

Deno.test("incident-update: an API error rejects with the vendor's title and detail", async () => {
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
