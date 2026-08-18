import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-update.ts";

const conn = { display: {} };

Deno.test("envelope-update: POSTs only the fields that were set, under `data`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "e1" } }], conn);
  await action.execute!({ envelopeId: "e1", title: "NDA v2", externalId: "" }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/update");
  assertEquals(JSON.parse(calls[0].body!), { envelopeId: "e1", data: { title: "NDA v2" } });
});

Deno.test("envelope-update: the meta object passes through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ envelopeId: "e1", meta: '{"subject":"Sign please"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data.meta, { subject: "Sign please" });
});

Deno.test("envelope-update: an update with nothing set is refused, not sent", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ envelopeId: "e1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
