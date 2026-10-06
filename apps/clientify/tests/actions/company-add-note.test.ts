import { assertEquals } from "@std/assert";
import companyAddNote from "../../actions/company-add-note.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-add-note: POST /v1/companies/{companyId}/note/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const result = await companyAddNote.execute({
    companyId: "3",
    name: "Intro",
    comment: "Met at the fair",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/companies/3/note/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), { name: "Intro", comment: "Met at the fair" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { status: "ok" });
});

Deno.test("company-add-note: declares type perform", () => {
  assertEquals(companyAddNote.type, "perform");
  assertEquals(companyAddNote.idempotent, false);
});

Deno.test("company-add-note: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await companyAddNote.execute(
      { companyId: "3", name: "Intro", comment: "Met at the fair" },
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
