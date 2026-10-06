import { assertEquals, assertRejects } from "@std/assert";
import submit, { parseContacts } from "../../actions/submit-enrichment-batch.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("submit-enrichment-batch: posts data plus batch options and returns the request id", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      error: false,
      success: true,
      request_id: "req1",
      credits_left: 99,
      data: [{ index: 0, errors: { only_contact_data: true } }],
    },
  }]);
  const out = await run(submit, {
    contacts: [{ email: "a@b.com" }, { first_name: "J", last_name: "S", website: "x.com" }],
    siren: true,
    language: "en",
    customCallbackUrl: " https://hook.example/cb ",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dropcontact.com/v1/enrich/all");
  assertEquals(JSON.parse(calls[0].body!), {
    data: [{ email: "a@b.com" }, { first_name: "J", last_name: "S", website: "x.com" }],
    siren: true,
    language: "en",
    custom_callback_url: "https://hook.example/cb",
  });
  assertEquals(out.requestId, "req1");
  assertEquals(out.creditsLeft, 99);
  assertEquals(out.submitted, 2);
  assertEquals((out.entries as unknown[]).length, 1);
});

Deno.test("submit-enrichment-batch: omits unset options and accepts a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, success: true, request_id: "r" } }]);
  await run(submit, { contacts: '[{"email":"a@b.com"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: [{ email: "a@b.com" }] });
});

Deno.test("submit-enrichment-batch: refuses bad batches before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => run(submit, { contacts: [] }, ctx), Error, "non-empty");
  await assertRejects(() => run(submit, { contacts: "nope" }, ctx), Error, "JSON array");
  await assertRejects(() => run(submit, { contacts: ["x"] }, ctx), Error, "object");
  await assertRejects(
    () => run(submit, { contacts: Array.from({ length: 251 }, () => ({ email: "a@b.c" })) }, ctx),
    Error,
    "at most 250",
  );
  assertEquals(calls.length, 0);
  assertEquals(parseContacts(Array.from({ length: 250 }, () => ({}))).length, 250);
});

Deno.test("submit-enrichment-batch: a 401 throws the vendor reason", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: true, reason: "Unknown account" } }]);
  await assertRejects(
    () => run(submit, { contacts: [{ email: "a@b.com" }] }, ctx),
    Error,
    "Unknown account",
  );
});
