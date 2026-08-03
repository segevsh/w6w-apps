import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-campaign.ts";

Deno.test("create-campaign: assembles the flat params into MailerLite's `emails` array", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", status: "draft" } } }]);
  await action.execute!({
    name: "Dummy campaign",
    subject: "Hello",
    fromName: "Ada",
    from: "ada@example.com",
    replyTo: "reply@example.com",
    content: "<p>hi</p>",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/campaigns");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Dummy campaign",
    type: "regular",
    emails: [{
      subject: "Hello",
      from_name: "Ada",
      from: "ada@example.com",
      reply_to: "reply@example.com",
      content: "<p>hi</p>",
    }],
  });
});

Deno.test("create-campaign: defaults type to regular", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ name: "x", subject: "s" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).type, "regular");
});

Deno.test("create-campaign: forwards groups, segments and language_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({
    name: "x",
    subject: "s",
    groups: ["42"],
    segments: ["7"],
    languageId: 4,
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.groups, ["42"]);
  assertEquals(body.segments, ["7"]);
  assertEquals(body.language_id, 4);
});

Deno.test("create-campaign: omits groups/segments/language_id when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ name: "x", subject: "s" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["emails", "name", "type"]);
});

Deno.test("create-campaign: a raw `emails` array overrides the flat params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({
    name: "x",
    type: "ab",
    subject: "ignored",
    emails: [{ subject: "A" }, { subject: "B" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "ab");
  assertEquals(body.emails, [{ subject: "A" }, { subject: "B" }]);
});

Deno.test("create-campaign: is NOT idempotent — each call drafts a new campaign", () => {
  assertEquals(action.idempotent, false);
});
