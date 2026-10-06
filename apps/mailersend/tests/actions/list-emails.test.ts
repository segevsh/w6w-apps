import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-emails.ts";
import { exec, mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("list-emails: GETs /v1/emails with the three required window params", async () => {
  const body = page([{ id: "e1", status: "delivered" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, {
    domainId: "d1",
    dateFrom: "1443651141",
    dateTo: "2026-10-01 23:59:59",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/emails");
  assertEquals(queryOf(calls[0].url), {
    domain_id: "d1",
    date_from: "1443651141",
    date_to: "2026-10-01 23:59:59",
  });
  assertEquals(out, body);
});

Deno.test("list-emails: array filters go out with brackets, never as bare keys", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await exec(action, {
    domainId: "d1",
    dateFrom: 1,
    dateTo: 2,
    status: ["sent", "delivered"],
    interaction: "opened, clicked",
  }, ctx);
  const url = calls[0].url;
  assertEquals(queryAll(url, "status[]"), ["sent", "delivered"]);
  assertEquals(queryAll(url, "interaction[]"), ["opened", "clicked"]);
  assertEquals(queryAll(url, "status"), [], "?status=sent is a 422 on the real API");
});

Deno.test("list-emails: forwards the scalar filters under their wire names", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await exec(action, {
    domainId: "d1",
    dateFrom: 1,
    dateTo: 2,
    page: 3,
    limit: 500,
    recipientEmail: "a@x.com",
    messageId: "m1",
    templateId: "t1",
    subject: "welcome",
    tag: "onboarding",
  }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.recipient_email, "a@x.com");
  assertEquals(q.message_id, "m1");
  assertEquals(q.template_id, "t1");
  assertEquals(q.subject, "welcome");
  assertEquals(q.tag, "onboarding");
  assertEquals([q.page, q.limit], ["3", "500"]);
});

Deno.test("list-emails: limit may reach 1000 and page 100 (unlike the other lists)", () => {
  const p = (k: string) => action.params!.find((x) => x.key === k)?.validation;
  assertEquals(p("limit"), { min: 10, max: 1000, integer: true });
  assertEquals(p("page"), { min: 1, max: 100, integer: true });
});

Deno.test("list-emails: a 422 about the window is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      message: "The given data was invalid.",
      errors: { date_from: ["The date from field is required."] },
    },
  }]);
  const err = await assertRejects(() => exec(action, { domainId: "d1" }, ctx));
  assert(String(err).includes("date_from"));
});
