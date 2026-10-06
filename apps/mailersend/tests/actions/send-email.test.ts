import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/send-email.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

const queued = {
  status: 202,
  body: undefined,
  headers: { "x-message-id": "5e42957d51f1d94a1070a733" },
};

Deno.test("send-email: POSTs /v1/email and returns the x-message-id header", async () => {
  const { ctx, calls } = mockCtx([queued]);
  const out = await exec(action, {
    fromEmail: "hello@example.com",
    fromName: "Hello",
    to: [{ email: "john@x.com", name: "John" }],
    subject: "Hi",
    html: "<b>hi</b>",
    text: "hi",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/email");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    from: { email: "hello@example.com", name: "Hello" },
    to: [{ email: "john@x.com", name: "John" }],
    subject: "Hi",
    text: "hi",
    html: "<b>hi</b>",
  });
  assertEquals(out, {
    accepted: true,
    messageId: "5e42957d51f1d94a1070a733",
    paused: false,
    warnings: [],
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("send-email: accepts bare strings and comma-separated recipients", async () => {
  const { ctx, calls } = mockCtx([queued]);
  await exec(action, {
    fromEmail: "a@x.com",
    to: "p@x.com, q@x.com",
    cc: ["c@x.com"],
    bcc: [{ email: "b@x.com" }],
    templateId: "tpl1",
  }, ctx);
  const b = bodyOf(calls[0]);
  assertEquals(b.to, [{ email: "p@x.com" }, { email: "q@x.com" }]);
  assertEquals(b.cc, [{ email: "c@x.com" }]);
  assertEquals(b.bcc, [{ email: "b@x.com" }]);
  assertEquals(b.template_id, "tpl1");
});

Deno.test("send-email: maps every optional field to its wire name and omits unset ones", async () => {
  const { ctx, calls } = mockCtx([queued]);
  await exec(action, {
    fromEmail: "a@x.com",
    to: ["p@x.com"],
    replyToEmail: "r@x.com",
    replyToName: "R",
    subject: "s",
    html: "h",
    language: "fr",
    tags: "a, b",
    personalization: [{ email: "p@x.com", data: { company: "Acme" } }],
    precedenceBulk: false,
    sendAt: 1893456000,
    inReplyTo: "<id@x>",
    references: ["<r1@x>"],
    settings: { track_clicks: false },
    attachments: [{ filename: "a.txt", content: "YQ==" }],
    headers: [{ name: "X-A", value: "1" }],
    listUnsubscribe: "<mailto:u@x.com>",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    from: { email: "a@x.com" },
    to: [{ email: "p@x.com" }],
    reply_to: { email: "r@x.com", name: "R" },
    subject: "s",
    html: "h",
    language: "fr",
    tags: ["a", "b"],
    personalization: [{ email: "p@x.com", data: { company: "Acme" } }],
    precedence_bulk: false,
    send_at: 1893456000,
    in_reply_to: "<id@x>",
    references: ["<r1@x>"],
    settings: { track_clicks: false },
    attachments: [{ filename: "a.txt", content: "YQ==" }],
    headers: [{ name: "X-A", value: "1" }],
    list_unsubscribe: "<mailto:u@x.com>",
  });
});

Deno.test("send-email: reports a paused domain from x-send-paused", async () => {
  const { ctx } = mockCtx([{
    status: 202,
    body: undefined,
    headers: { "x-message-id": "m1", "x-send-paused": "true" },
  }]);
  const out = await exec(action, {
    fromEmail: "a@x.com",
    to: ["p@x.com"],
    text: "t",
    subject: "s",
  }, ctx);
  assertEquals(out.paused, true);
  assertEquals(out.messageId, "m1");
});

Deno.test("send-email: some-suppressed warnings come back, all-suppressed has a null messageId", async () => {
  const warnings = [{
    type: "ALL_SUPPRESSED",
    message: "All of the recipients provided have been suppressed.",
  }];
  const { ctx } = mockCtx([{
    status: 202,
    body: { message: "There are some warnings for your request.", warnings },
  }]);
  const out = await exec(action, {
    fromEmail: "a@x.com",
    to: ["p@x.com"],
    text: "t",
    subject: "s",
  }, ctx);
  assertEquals(out.messageId, null);
  assertEquals(out.warnings, warnings);
});

Deno.test("send-email: a 422 carries the field errors and the MS code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      message: "The given data was invalid.",
      errors: {
        "from.email": [
          "The from.email domain must be verified in your account to send emails. #MS42207",
        ],
      },
    },
  }]);
  const err = await assertRejects(() =>
    exec(action, { fromEmail: "a@nope.com", to: ["p@x.com"], text: "t", subject: "s" }, ctx)
  );
  const msg = String(err);
  assert(msg.includes("422") && msg.includes("from.email") && msg.includes("#MS42207"), msg);
});

Deno.test("send-email: a 429 names the retry delay", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { message: "Your account reached its rate limit of 120 requests/min. #MS42903" },
    headers: { "content-type": "application/json", "retry-after": "42" },
  }]);
  const err = await assertRejects(() =>
    exec(action, { fromEmail: "a@x.com", to: ["p@x.com"], text: "t", subject: "s" }, ctx)
  );
  assert(String(err).includes("retry after 42s"));
});

Deno.test("send-email: is a non-idempotent perform (the API has no idempotency key)", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params!.find((p) => p.key === "to")?.required, true);
});
