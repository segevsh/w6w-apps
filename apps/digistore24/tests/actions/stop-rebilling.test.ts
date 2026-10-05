import { assert, assertEquals, assertRejects } from "@std/assert";
import stopRebilling from "../../actions/stop-rebilling.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "stopRebilling";
const DATA = { "ok": "Y" };

Deno.test("stop-rebilling: calls stopRebilling with POST and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await stopRebilling.execute({ "purchase_id": "X26QE8GN" }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "POST");
  assertEquals(fieldsOf(calls[0]), { "purchase_id": "X26QE8GN" });
  assertEquals(out, DATA);
});

Deno.test("stop-rebilling: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await stopRebilling.execute({
    "purchase_id": "X26QE8GN",
    "force": true,
    "ignore_refund_possibility": true,
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "purchase_id": "X26QE8GN",
    "force": "Y",
    "ignore_refund_possibility": "Y",
  });
});

Deno.test("stop-rebilling: form-encodes the body and never puts arguments in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await stopRebilling.execute({
    "purchase_id": "X26QE8GN",
    "force": true,
    "ignore_refund_possibility": true,
  }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
  assert(!("x-ds-api-key" in calls[0].headers), "credential must come from sign, not the action");
});

Deno.test("stop-rebilling: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await stopRebilling.execute({ "purchase_id": "X26QE8GN" }, ctx),
    Error,
    "The API key is invalid.",
  );
});

Deno.test("stop-rebilling: declares idempotency as true", () => {
  assertEquals(stopRebilling.idempotent, true);
});
