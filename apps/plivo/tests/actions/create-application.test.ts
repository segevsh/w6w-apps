import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, json, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-application.ts";

Deno.test("create-application: POSTs the name alone when nothing else is set", async () => {
  const body = { message: "created", app_id: "15784735442685051", api_id: "a" };
  const { ctx, calls } = mockCtx([{ status: 201, body }], CONN);
  const out = await action.execute!({ appName: "IVR" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, BASE + "Application/");
  assertEquals(json(calls[0]), { app_name: "IVR" });
  assertEquals(out, body);
});

Deno.test("create-application: URLs, methods and logging map to the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], CONN);
  await action.execute!(
    {
      appName: "IVR",
      answerUrl: "https://a",
      answerMethod: "GET",
      hangupUrl: "https://h",
      hangupMethod: "POST",
      fallbackAnswerUrl: "https://f",
      fallbackMethod: "GET",
      messageUrl: "https://m",
      messageMethod: "POST",
      logIncomingMessages: false,
    },
    ctx,
  );
  assertEquals(json(calls[0]), {
    app_name: "IVR",
    answer_url: "https://a",
    answer_method: "GET",
    hangup_url: "https://h",
    hangup_method: "POST",
    fallback_answer_url: "https://f",
    fallback_method: "GET",
    message_url: "https://m",
    message_method: "POST",
    log_incoming_messages: false,
  });
});

Deno.test("create-application: a vendor 400 is thrown", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "bad url" }], CONN);
  await assertRejects(async () => await action.execute!({ appName: "x" }, ctx), Error, "bad url");
});
