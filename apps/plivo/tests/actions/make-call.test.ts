import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, json, mockCtx } from "../_helpers.ts";
import action from "../../actions/make-call.ts";

const FIRED = {
  message: "call fired",
  request_uuid: "9834029e-58b6-11e1-b8b7-a5bd0e4e126f",
  api_id: "97ceeb52-58b6-11e1-86da-77300b68f8bb",
};

Deno.test("make-call: POSTs from/to/answer_url to Call/", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: FIRED }], CONN);
  const out = await action.execute!(
    { from: "14157654321", to: "14151234567", answerUrl: "https://example.com/answer" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, BASE + "Call/");
  assertEquals(json(calls[0]), {
    from: "14157654321",
    to: "14151234567",
    answer_url: "https://example.com/answer",
  });
  assertEquals(out, FIRED);
});

Deno.test("make-call: bulk destinations join with `<` and options use snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: FIRED }], CONN);
  await action.execute!(
    {
      from: "1",
      to: ["2", "3"],
      answerUrl: "https://a",
      answerMethod: "GET",
      ringUrl: "https://r",
      hangupUrl: "https://h",
      fallbackUrl: "https://f",
      callerName: "Acme",
      sendDigits: "1w2",
      timeLimit: 60,
      ringTimeout: 20,
      machineDetection: "hangup",
    },
    ctx,
  );
  assertEquals(json(calls[0]), {
    from: "1",
    to: "2<3",
    answer_url: "https://a",
    answer_method: "GET",
    ring_url: "https://r",
    hangup_url: "https://h",
    fallback_url: "https://f",
    caller_name: "Acme",
    send_digits: "1w2",
    time_limit: 60,
    ring_timeout: 20,
    machine_detection: "hangup",
  });
});

Deno.test("make-call: an empty destination is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], CONN);
  await assertRejects(
    async () => await action.execute!({ from: "1", to: [], answerUrl: "https://a" }, ctx),
    Error,
    "`to` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("make-call: a 400 is thrown with Plivo's text", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "answer_url invalid" } }], CONN);
  await assertRejects(
    async () => await action.execute!({ from: "1", to: "2", answerUrl: "x" }, ctx),
    Error,
    "answer_url invalid",
  );
});
