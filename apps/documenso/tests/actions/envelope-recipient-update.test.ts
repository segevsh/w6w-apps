import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-recipient-update.ts";

const conn = { display: {} };

Deno.test("envelope-recipient-update: POSTs the changes keyed by recipient id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { recipients: [] } }], conn);
  await action.execute!({
    envelopeId: "e1",
    recipients: '[{"id":12,"email":"corrected@example.com"}]',
  }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/recipient/update-many");
  assertEquals(JSON.parse(calls[0].body!).data[0].id, 12);
});

/** Updates are keyed by id, not by position in the list. */
Deno.test("envelope-recipient-update: a recipient without an id is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!({ envelopeId: "e1", recipients: '[{"email":"a@x.com"}]' }, ctx),
    Error,
    "keyed by the recipient's id",
  );
  assertEquals(calls.length, 0);
});
