import { assertEquals, assertRejects } from "@std/assert";
import enrich from "../../actions/enrich-contact.ts";
import { mockCtx, run } from "../_helpers.ts";

const submitted = { body: { error: false, success: true, request_id: "r1", credits_left: 10 } };

Deno.test("enrich-contact: default submits one contact and returns the request id", async () => {
  const { ctx, calls } = mockCtx([submitted]);
  const out = await run(enrich, { firstName: "John", lastName: "Smith", website: "corp.com" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(calls[0].body!), {
    data: [{ first_name: "John", last_name: "Smith", website: "corp.com" }],
  });
  assertEquals(out.requestId, "r1");
  assertEquals(out.ready, false);
});

Deno.test("enrich-contact: waitSeconds polls past 'not ready' and shapes the contact", async () => {
  const { ctx, calls } = mockCtx([
    submitted,
    { body: { error: false, success: false, reason: "Request not ready yet" } },
    {
      body: {
        error: false,
        success: true,
        credits_left: 9,
        data: [{
          first_name: "John",
          email: [
            { email: "contact@corp.com", qualification: "generic@pro" },
            { email: "john@corp.com", qualification: "nominative@pro" },
          ],
        }],
      },
    },
  ]);
  const out = await run(enrich, {
    email: "x@corp.com",
    waitSeconds: 5,
    pollIntervalSeconds: 0.001,
  }, ctx);
  assertEquals(calls.map((c) => c.method), ["POST", "GET", "GET"]);
  assertEquals(calls[1].url, "https://api.dropcontact.com/v1/enrich/all/r1");
  assertEquals(out.ready, true);
  assertEquals(out.email, "john@corp.com");
  assertEquals(out.emailQualification, "nominative@pro");
  assertEquals((out.emails as unknown[]).length, 2);
  assertEquals(out.creditsLeft, 9);
});

Deno.test("enrich-contact: gives up at the deadline with ready false", async () => {
  const pending = { body: { error: false, success: false, reason: "not ready" } };
  const { ctx } = mockCtx(
    Array.from({ length: 400 }, () => pending).map((p, i) => i === 0 ? submitted : p),
  );
  const out = await run(
    enrich,
    { email: "a@b.com", waitSeconds: 0.05, pollIntervalSeconds: 0.01 },
    ctx,
  );
  assertEquals(out.ready, false);
  assertEquals(out.requestId, "r1");
});

Deno.test("enrich-contact: no fields throws before any request; a 401 throws", async () => {
  const none = mockCtx();
  await assertRejects(() => run(enrich, { firstName: " " }, none.ctx), Error, "at least one");
  assertEquals(none.calls.length, 0);
  const bad = mockCtx([{ status: 401, body: { error: true, reason: "Unknown account" } }]);
  await assertRejects(() => run(enrich, { email: "a@b.com" }, bad.ctx), Error, "Unknown account");
});
