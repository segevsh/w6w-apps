import { assertEquals } from "@std/assert";
import dealAddNote from "../../actions/deal-add-note.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-add-note: POST /v1/deals/{dealId}/note/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const result = await dealAddNote.execute({ dealId: "5", name: "Quote", comment: "Sent" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/deals/5/note/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), { name: "Quote", comment: "Sent" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { status: "ok" });
});

Deno.test("deal-add-note: declares type perform", () => {
  assertEquals(dealAddNote.type, "perform");
  assertEquals(dealAddNote.idempotent, false);
});

Deno.test("deal-add-note: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await dealAddNote.execute({ dealId: "5", name: "Quote", comment: "Sent" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
