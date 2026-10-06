import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/incident-action-item-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("incident-action-item-create: full input maps to POST /v1/incidents/{incident_id}/action_items", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "incident_action_items",
        "attributes": {
          "name": "alpha",
        },
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({
    "incident_id": "incident_id-1",
    "summary": "sample-summary",
    "description": "sample-description",
    "kind": "task",
    "priority": "high",
    "status": "open",
    "due_date": "sample-due_date",
    "assigned_to_user_id": 7,
    "assigned_to_group_ids": [
      "a1",
      "b2",
    ],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://api.rootly.com/v1/incidents/incident_id-1/action_items",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "incident_action_items",
      "attributes": {
        "summary": "sample-summary",
        "description": "sample-description",
        "kind": "task",
        "priority": "high",
        "status": "open",
        "due_date": "sample-due_date",
        "assigned_to_user_id": 7,
        "assigned_to_group_ids": [
          "a1",
          "b2",
        ],
      },
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "incident_action_items",
    },
    "included": [],
  });
});

Deno.test("incident-action-item-create: required input only maps to POST /v1/incidents/{incident_id}/action_items", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "incident_action_items",
        "attributes": {
          "name": "alpha",
        },
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({
    "incident_id": "incident_id-1",
    "summary": "sample-summary",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://api.rootly.com/v1/incidents/incident_id-1/action_items",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "incident_action_items",
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
      "type": "incident_action_items",
    },
    "included": [],
  });
});

Deno.test("incident-action-item-create: an API error rejects with the vendor's title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ title: "Resource not found", status: "404", detail: "no such id" }] },
  }]);
  const err = await assertRejects(async () =>
    await action.execute!({
      "incident_id": "incident_id-1",
      "summary": "sample-summary",
    }, ctx), Error);
  assertEquals(err.message.includes("HTTP 404"), true);
  assertEquals(err.message.includes("Resource not found: no such id"), true);
});
