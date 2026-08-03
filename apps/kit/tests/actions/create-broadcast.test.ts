import { assertEquals } from "@std/assert";
import action from "../../actions/create-broadcast.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-broadcast: a bare call saves a draft via an explicit send_at: null", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { broadcast: { id: 9 } } }]);
  await action.execute!({ subject: "Hi", content: "<p>Hi</p>" }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/broadcasts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    subject: "Hi",
    content: "<p>Hi</p>",
    send_at: null,
  });
});

Deno.test("create-broadcast: a sendAt schedules rather than drafts", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { broadcast: {} } }]);
  await action.execute!(
    { subject: "Hi", content: "<p>Hi</p>", sendAt: "2026-09-01T10:00:00Z" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).send_at, "2026-09-01T10:00:00Z");
});

Deno.test("create-broadcast: maps every optional field onto Kit's snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { broadcast: {} } }]);
  await action.execute!({
    subject: "Hi",
    content: "<p>Hi</p>",
    description: "August update",
    previewText: "A peek",
    public: true,
    publishedAt: "2026-08-01T00:00:00Z",
    emailAddress: "hello@example.com",
    emailTemplateId: 4,
    thumbnailUrl: "https://example.com/t.png",
    thumbnailAlt: "Thumb",
    subscriberFilter: [{ any: [{ type: "tag", ids: [12] }] }],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    subject: "Hi",
    content: "<p>Hi</p>",
    description: "August update",
    preview_text: "A peek",
    send_at: null,
    public: true,
    published_at: "2026-08-01T00:00:00Z",
    email_address: "hello@example.com",
    email_template_id: 4,
    thumbnail_url: "https://example.com/t.png",
    thumbnail_alt: "Thumb",
    subscriber_filter: [{ any: [{ type: "tag", ids: [12] }] }],
  });
});

Deno.test("create-broadcast: is not idempotent — each call makes another broadcast", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
