import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/call-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-list: full input maps to GET /calls", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [{ "uuid": "x1" }],
      "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
    },
  }]);
  const out = await action.execute!({
    "page": 2,
    "items": 2,
    "order": "created_at desc",
    "date_filter": "created_at",
    "from": "sample-from",
    "to": "sample-to",
    "source": "sample-source",
    "source_id": ["a1", "b2"],
    "owner_uuid": ["a1", "b2"],
    "participating_user_uuid": ["a1", "b2"],
    "conversation_type_uuid": "sample-conversation_type_uuid",
    "customer_phone_number": ["a1", "b2"],
    "customer_email_address": ["a1", "b2"],
    "with_simple_transcript": true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/calls");
  assertEquals(calls[0].method, "GET");
  assertEquals(
    decodeURIComponent(url.search),
    "?page=2&items=2&order=created_at desc&date_filter=created_at&from=sample-from&to=sample-to&source=sample-source&source_id[]=a1&source_id[]=b2&owner_uuid[]=a1&owner_uuid[]=b2&participating_user_uuid[]=a1&participating_user_uuid[]=b2&conversation_type_uuid=sample-conversation_type_uuid&customer_phone_number[]=a1&customer_phone_number[]=b2&customer_email_address[]=a1&customer_email_address[]=b2&with_simple_transcript=true",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "data": [{ "uuid": "x1" }],
    "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
  });
});

Deno.test("call-list: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "page": 2,
    "items": 2,
    "order": "created_at desc",
    "date_filter": "created_at",
    "from": "sample-from",
    "to": "sample-to",
    "source": "sample-source",
    "source_id": ["a1", "b2"],
    "owner_uuid": ["a1", "b2"],
    "participating_user_uuid": ["a1", "b2"],
    "conversation_type_uuid": "sample-conversation_type_uuid",
    "customer_phone_number": ["a1", "b2"],
    "customer_email_address": ["a1", "b2"],
    "with_simple_transcript": true,
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("call-list: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "page": 2,
        "items": 2,
        "order": "created_at desc",
        "date_filter": "created_at",
        "from": "sample-from",
        "to": "sample-to",
        "source": "sample-source",
        "source_id": ["a1", "b2"],
        "owner_uuid": ["a1", "b2"],
        "participating_user_uuid": ["a1", "b2"],
        "conversation_type_uuid": "sample-conversation_type_uuid",
        "customer_phone_number": ["a1", "b2"],
        "customer_email_address": ["a1", "b2"],
        "with_simple_transcript": true,
      }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("call-list: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "page": 2,
        "items": 2,
        "order": "created_at desc",
        "date_filter": "created_at",
        "from": "sample-from",
        "to": "sample-to",
        "source": "sample-source",
        "source_id": ["a1", "b2"],
        "owner_uuid": ["a1", "b2"],
        "participating_user_uuid": ["a1", "b2"],
        "conversation_type_uuid": "sample-conversation_type_uuid",
        "customer_phone_number": ["a1", "b2"],
        "customer_email_address": ["a1", "b2"],
        "with_simple_transcript": true,
      }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("call-list: declares type, params and output", () => {
  assertEquals(action.type, "search");
  assertEquals(action.key, "call-list");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 14);
});
