import { assertEquals } from "@std/assert";
import campaignCreate from "../../actions/campaign-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const required = {
  title: "August newsletter",
  subject: "What we shipped",
  html: "<h1>Hi</h1>",
  fromName: "Acme",
  fromEmail: "news@acme.example",
};

Deno.test("campaign-create: POSTs the required five fields to /campaigns", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 8, ...required, sent_at: null } }]);
  const out = await campaignCreate.execute(required, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/campaigns");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    title: "August newsletter",
    subject: "What we shipped",
    html: "<h1>Hi</h1>",
    from_name: "Acme",
    from_email: "news@acme.example",
  });
  assertEquals(out.id, 8);
});

Deno.test("campaign-create: audience and schedule fields are mapped", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 8 } }]);
  await campaignCreate.execute(
    {
      ...required,
      previewText: "A peek",
      scheduledAt: "2026-10-01T09:00:00.000Z",
      lists: [1],
      excludedLists: [2],
      toContactTags: [7],
      excludedContactTags: [8],
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.preview_text, "A peek");
  assertEquals(body.scheduled_at, "2026-10-01T09:00:00.000Z");
  assertEquals(body.lists, [1]);
  assertEquals(body.excluded_lists, [2]);
  assertEquals(body.to_contact_tags, [7]);
  assertEquals(body.excluded_contact_tags, [8]);
});

Deno.test("campaign-create: exactly the document's five fields are required", () => {
  const requiredKeys = (campaignCreate.params ?? [])
    .filter((p) => p.required)
    .map((p) => p.key);
  assertEquals(requiredKeys, ["title", "subject", "html", "fromName", "fromEmail"]);
});

Deno.test("campaign-create: is not marked idempotent — every call makes a draft", () => {
  assertEquals(campaignCreate.idempotent, false);
});
