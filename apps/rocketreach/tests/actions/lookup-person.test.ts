import { assertEquals, assertRejects } from "@std/assert";
import lookupPerson from "../../actions/lookup-person.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("lookup-person: GETs /person/lookup with query params and maps a complete profile", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: 5244,
      status: "complete",
      name: "Mark Benioff",
      current_title: "CEO",
      current_employer: "Salesforce",
      recommended_email: "m@salesforce.com",
      emails: [{ email: "m@salesforce.com", type: "professional", grade: "A" }],
      phones: [{ number: "+1 415-555-0100", type: "mobile" }],
    },
  }]);
  const out = await run(lookupPerson, {
    linkedin_url: "www.linkedin.com/in/benioff",
    webhook_id: 9,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.rocketreach.co/api/v2/person/lookup");
  assertEquals(url.searchParams.get("linkedin_url"), "www.linkedin.com/in/benioff");
  assertEquals(url.searchParams.get("webhook_id"), "9");
  assertEquals(calls[0].method, "GET");
  assertEquals([out.id, out.complete, out.recommendedEmail], [5244, true, "m@salesforce.com"]);
  assertEquals(out.emails[0].grade, "A");
  assertEquals(out.phones.length, 1);
});

Deno.test("lookup-person: an in-progress lookup is complete: false", async () => {
  const { ctx } = mockCtx([{ body: { id: 5, status: "searching" } }]);
  const out = await run(lookupPerson, { id: 5, return_cached_emails: false }, ctx);
  assertEquals([out.status, out.complete, out.emails], ["searching", false, []]);
});

Deno.test("lookup-person: sends return_cached_emails=false, refuses an unidentified person", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5, status: "complete" } }]);
  await run(lookupPerson, { id: 5, return_cached_emails: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("return_cached_emails"), "false");
  const none = mockCtx();
  await assertRejects(
    () => run(lookupPerson, { name: "Only A Name" }, none.ctx),
    Error,
    "Identify the person",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("lookup-person: a 403 (lookup credits exhausted) throws with the vendor text", async () => {
  const bad = mockCtx([{ status: 403, body: { detail: "You have no lookup credits" } }]);
  await assertRejects(() => run(lookupPerson, { id: 1 }, bad.ctx), Error, "no lookup credits");
});
