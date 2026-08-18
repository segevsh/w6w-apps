import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-recipient-get.ts";

const conn = { display: {} };

/** The answer to "has Ada signed", which the envelope's status cannot give. */
Deno.test("envelope-recipient-get: reads one recipient's own state", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { id: 12, signingStatus: "SIGNED" } }],
    conn,
  );
  const result = await action.execute!({ recipientId: 12 }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/recipient/12");
  assertEquals(result.signingStatus, "SIGNED");
});

Deno.test("envelope-recipient-get: the output distinguishes read from signed", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "signingStatus")!.label.includes("THIS person"));
  assert(outputs.find((o) => o.key === "readStatus")!.label.includes("opened"));
});

Deno.test("envelope-recipient-get: a missing id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`recipientId`");
  assertEquals(calls.length, 0);
});
