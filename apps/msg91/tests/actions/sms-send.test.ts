import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/sms-send.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  templateId: "tpl1",
  mobiles: "+91 98765 43210, 919000000001",
  variables: { VAR1: "Ada" },
  shortUrl: true,
  shortUrlExpiry: 60,
  realTimeResponse: true,
};

Deno.test("sms-send: POST /flow with one recipient per number carrying the variables", async () => {
  const { ctx, calls } = mockCtx([{
    body: { type: "success", message: "5e1e93cad6fc054d8e759a5b" },
  }]);
  const out = await action.execute(INPUT, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v5/flow");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    template_id: "tpl1",
    short_url: "1",
    short_url_expiry: 60,
    realTimeResponse: "1",
    recipients: [
      { VAR1: "Ada", mobiles: "919876543210" },
      { VAR1: "Ada", mobiles: "919000000001" },
    ],
  });
  assertEquals(out, { requestId: "5e1e93cad6fc054d8e759a5b", recipientCount: 2 });
});

Deno.test("sms-send: explicit recipients override mobiles and are normalised", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "success", message: "r1" } }]);
  await action.execute({
    templateId: "t",
    recipients: [{ mobiles: "+919111111111", VAR1: "a" }, { mobiles: "919222222222", VAR1: "b" }],
    mobiles: "1",
  }, ctx);
  const body = jsonBody(calls[0]) as { recipients: unknown[]; short_url?: unknown };
  assertEquals(body.recipients, [
    { mobiles: "919111111111", VAR1: "a" },
    { mobiles: "919222222222", VAR1: "b" },
  ]);
  assertEquals("short_url" in body, false);
});

Deno.test("sms-send: requires a template and at least one number", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({ mobiles: "919876543210" }, ctx));
  await assertRejects(async () => await action.execute({ templateId: "t" }, ctx));
});

Deno.test("sms-send: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    body: { type: "success", message: "5e1e93cad6fc054d8e759a5b" },
  }]);
  await action.execute({
    templateId: "tpl1",
    mobiles: "+91 98765 43210, 919000000001",
    variables: { VAR1: "Ada" },
  }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("sms-send: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({
      templateId: "tpl1",
      mobiles: "+91 98765 43210, 919000000001",
      variables: { VAR1: "Ada" },
    }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
