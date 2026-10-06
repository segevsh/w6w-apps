import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/team-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("team-update: full input maps to PUT /v1/teams/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "groups",
        "attributes": {
          "name": "alpha",
        },
      },
    },
  }], { invocation: { invocationId: "inv-42" } });
  const out = await action.execute!({
    "id": "id-1",
    "name": "sample-name",
    "description": "sample-description",
    "public_description": "sample-public_description",
    "slug": "sample-slug",
    "color": "sample-color",
    "notify_emails": [
      "a1",
      "b2",
    ],
    "user_ids": [
      1,
      2,
    ],
    "admin_ids": [
      1,
      2,
    ],
    "alert_urgency_id": "sample-alert_urgency_id",
    "external_id": "sample-external_id",
    "backstage_id": "sample-backstage_id",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/teams/id-1");
  assertEquals(calls[0].method, "PUT");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "groups",
      "id": "id-1",
      "attributes": {
        "name": "sample-name",
        "description": "sample-description",
        "public_description": "sample-public_description",
        "slug": "sample-slug",
        "color": "sample-color",
        "notify_emails": [
          "a1",
          "b2",
        ],
        "user_ids": [
          1,
          2,
        ],
        "admin_ids": [
          1,
          2,
        ],
        "alert_urgency_id": "sample-alert_urgency_id",
        "external_id": "sample-external_id",
        "backstage_id": "sample-backstage_id",
      },
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "groups",
    },
    "included": [],
  });
});

Deno.test("team-update: required input only maps to PUT /v1/teams/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": {
        "id": "r1",
        "type": "groups",
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
  assertEquals(url.origin + url.pathname, "https://api.rootly.com/v1/teams/id-1");
  assertEquals(calls[0].method, "PUT");
  assertEquals([...url.searchParams.entries()], []);
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(JSON.parse(calls[0].body!), {
    "data": {
      "type": "groups",
      "id": "id-1",
      "attributes": {},
    },
  });
  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(out, {
    "item": {
      "name": "alpha",
      "id": "r1",
      "type": "groups",
    },
    "included": [],
  });
});

Deno.test("team-update: an API error rejects with the vendor's title and detail", async () => {
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
