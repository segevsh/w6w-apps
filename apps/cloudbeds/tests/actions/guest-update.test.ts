import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import guestUpdate from "../../actions/guest-update.ts";
import { envelope, formOf, mockCtx, pathOf } from "../_helpers.ts";

test("guest-update: PUT /putGuest, form-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await guestUpdate.execute({ guestID: "g1", guestEmail: "ada@example.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1.3/putGuest");
  assertEquals(calls[0].method, "PUT");
  const form = formOf(calls[0].body);
  assertEquals(form.guestID, "g1");
  assertEquals(form.guestEmail, "ada@example.com");
});

test("guest-update: guestID is declared required", () => {
  const param = guestUpdate.params!.find((p) => p.key === "guestID");
  assertEquals(param?.required, true);
});

test("guest-update: guestCustomFields uses the vendor's customFieldName/customFieldValue shape", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await guestUpdate.execute(
    {
      guestID: "g1",
      guestCustomFields: [{ customFieldName: "loyaltyTier", customFieldValue: "gold" }],
    },
    ctx,
  );
  const form = formOf(calls[0].body);
  assertEquals(form["guestCustomFields[0][customFieldName]"], "loyaltyTier");
  assertEquals(form["guestCustomFields[0][customFieldValue]"], "gold");
});
