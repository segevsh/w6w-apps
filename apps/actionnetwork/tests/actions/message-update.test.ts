import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/message-update.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT: Record<string, unknown> = {
  "messageId": "action_network:messageid",
  "name": "name text",
  "subject": "subject text",
  "from": "from text",
  "replyTo": "replyTo text",
  "body": "body text",
  "queryIds": [
    "alpha",
    "beta",
  ],
  "tagList": [
    "alpha",
    "beta",
  ],
};

const REPLY = { identifiers: ["action_network:abc"], x: 1, _links: {} };

Deno.test("message-update: sends PUT with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await action.execute!(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://actionnetwork.org/api/v2/messages/messageid");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "name text",
    "subject": "subject text",
    "from": "from text",
    "reply_to": "replyTo text",
    "body": "body text",
    "targets": [
      {
        "href": "https://actionnetwork.org/api/v2/queries/alpha",
      },
      {
        "href": "https://actionnetwork.org/api/v2/queries/beta",
      },
    ],
    "tag_list": [
      "alpha",
      "beta",
    ],
  });
  assertEquals(out, {
    "id": "abc",
    "identifiers": [
      "action_network:abc",
    ],
    "x": 1,
  });
});

Deno.test("message-update: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("osdi-api-token" in calls[0].headers), "the sign hook injects credentials, not actions");
  assertEquals(calls[0].headers.accept, "application/hal+json, application/json");
});

Deno.test("message-update: surfaces a vendor error and never echoes the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "API Key invalid or not present sk_live_SECRET" },
  }]);
  const err = await assertRejects(async () => await action.execute!(INPUT, ctx), Error, "HTTP 401");
  assert(
    !String(err.message).includes("sk_live_SECRET"),
    "the vendor echoes the key; it must be cut",
  );
});

Deno.test("message-update: declares its type, params and output", () => {
  assertEquals(action.key, "message-update");
  assertEquals(action.resource, "message");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(action.params!.length === 8);
  assertEquals(Array.isArray(action.output) ? action.output.length : 0, 12);
});
