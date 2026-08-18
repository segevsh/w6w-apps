import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-field-add.ts";

const conn = { display: {} };
const FIELD = '[{"recipientId":12,"type":"SIGNATURE","pageNumber":1,"pageX":10,"pageY":80,' +
  '"width":25,"height":8}]';

Deno.test("envelope-field-add: POSTs the fields under `data`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { fields: [] } }], conn);
  await action.execute!({ envelopeId: "e1", fields: FIELD }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/field/create-many");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.envelopeId, "e1");
  assertEquals(body.data[0].type, "SIGNATURE");
});

/** Positions are percentages; a pixel coordinate lands somewhere absurd. */
Deno.test("envelope-field-add: a position over 100 is caught as a pixel mistake", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () =>
      await action.execute!({
        envelopeId: "e1",
        fields: '[{"recipientId":12,"pageX":420,"pageY":80}]',
      }, ctx),
    Error,
  );
  assert(err.message.includes("percentages of the page"), err.message);
  assertEquals(calls.length, 0);
});

/** A field nobody owns cannot be filled. */
Deno.test("envelope-field-add: a field without a recipient is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ envelopeId: "e1", fields: '[{"type":"SIGNATURE"}]' }, ctx),
    Error,
    "has no `recipientId`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("envelope-field-add: an empty field list is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ envelopeId: "e1", fields: "[]" }, ctx),
    Error,
    "`fields` is required",
  );
  assertEquals(calls.length, 0);
});
