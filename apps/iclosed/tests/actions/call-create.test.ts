import { assertEquals } from "@std/assert";
import callCreate from "../../actions/call-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("call-create: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await callCreate.execute({
    "dateTime": "x-dateTime",
    "timeZone": "x-timeZone",
    "secondaryQuestionsAnswer": '[{"identifier": "budget", "answer": ["10k"]}]',
    "contactId": 7,
    "email": "x-email",
    "phoneNumber": "x-phoneNumber",
    "firstName": "x-firstName",
    "lastName": "x-lastName",
    "eventId": 7,
    "linkPrefix": "x-linkPrefix",
    "conditionalUsers": "x-conditionalUsers",
    "routingGroupIds": "x-routingGroupIds",
    "useSecondaryQuestionsForConditionalRouting": true,
    "additionalGuests": '[{"email": "g@e.com", "name": "G"}]',
  } as never, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/eventCalls");
  assertEquals(JSON.parse(calls[0].body!), {
    "dateTime": "x-dateTime",
    "timeZone": "x-timeZone",
    "secondaryQuestionsAnswer": [{ "identifier": "budget", "answer": ["10k"] }],
    "contactId": 7,
    "email": "x-email",
    "phoneNumber": "x-phoneNumber",
    "firstName": "x-firstName",
    "lastName": "x-lastName",
    "eventId": 7,
    "linkPrefix": "x-linkPrefix",
    "conditionalUsers": "x-conditionalUsers",
    "routingGroupIds": "x-routingGroupIds",
    "useSecondaryQuestionsForConditionalRouting": true,
    "additionalGuests": [{ "email": "g@e.com", "name": "G" }],
  });
  assertEquals(out, REPLY);
});

Deno.test("call-create: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await callCreate.execute(
    {
      "dateTime": "x-dateTime",
      "timeZone": "x-timeZone",
      "secondaryQuestionsAnswer": '[{"identifier": "budget", "answer": ["10k"]}]',
    } as never,
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    "dateTime": "x-dateTime",
    "timeZone": "x-timeZone",
    "secondaryQuestionsAnswer": [{ "identifier": "budget", "answer": ["10k"] }],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("call-create: declares a perform action's idempotency", () => {
  assertEquals(callCreate.type, "perform");
  assertEquals(callCreate.idempotent, false);
  assertEquals(callCreate.params!.filter((p) => p.required).map((p) => p.key), [
    "dateTime",
    "timeZone",
    "secondaryQuestionsAnswer",
  ]);
});
