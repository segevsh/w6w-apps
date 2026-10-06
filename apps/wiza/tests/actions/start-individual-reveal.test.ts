import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/start-individual-reveal.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

const started = {
  status: { code: 200 },
  type: "individual_reveal",
  data: { id: 5, status: "queued", is_complete: false },
};

Deno.test("start-individual-reveal: LinkedIn URL reveal posts the nested envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: started }]);
  const out = await exec(action, {
    profileUrl: "https://www.linkedin.com/in/x/",
    enrichmentLevel: "partial",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://wiza.co/api/individual_reveals");
  assertEquals(bodyOf(calls[0]), {
    individual_reveal: { profile_url: "https://www.linkedin.com/in/x/" },
    enrichment_level: "partial",
  });
  assertEquals(out, { id: 5, status: "queued", is_complete: false });
});

Deno.test("start-individual-reveal: name + domain with email options, callback and fair key", async () => {
  const { ctx, calls } = mockCtx([{ body: started }]);
  await exec(action, {
    fullName: "Stephen Hakami",
    domain: "wiza.co",
    enrichmentLevel: "full",
    acceptWork: true,
    acceptPersonal: false,
    callbackUrl: "https://example.com/hook",
    fairKey: "user-1",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    individual_reveal: { full_name: "Stephen Hakami", domain: "wiza.co" },
    enrichment_level: "full",
    email_options: { accept_work: true, accept_personal: false },
    callback_url: "https://example.com/hook",
    reveal_options: { fair_key: "user-1" },
  });
});

Deno.test("start-individual-reveal: email alone is enough; a bare name is not", async () => {
  const { ctx, calls } = mockCtx([{ body: started }]);
  await exec(action, { email: "a@b.co", enrichmentLevel: "phone" }, ctx);
  assertEquals(bodyOf(calls[0]).individual_reveal, { email: "a@b.co" });
  const none = mockCtx();
  await assertRejects(
    () => exec(action, { fullName: "Only Name", enrichmentLevel: "none" }, none.ctx),
    Error,
    "provide a LinkedIn profile URL",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("start-individual-reveal: a 429 queue-full response fails with the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: { code: 429, message: "Queue full" } },
  }]);
  await assertRejects(
    () => exec(action, { email: "a@b.co", enrichmentLevel: "partial" }, ctx),
    Error,
    "Queue full",
  );
});
