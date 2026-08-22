import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-download.ts";

const conn = { display: {} };

/** A short-lived URL rather than bytes — an App returns JSON. */
Deno.test("envelope-download: returns a download link", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { downloadUrl: "https://x/y.pdf" } }], conn);
  const result = await action.execute!({ envelopeId: "e1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/envelope/e1/download");
  assertEquals(result.downloadUrl, "https://x/y.pdf");
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "downloadUrl")!.label.includes("Short-lived"));
});

Deno.test("envelope-download: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`envelopeId`");
  assertEquals(calls.length, 0);
});
