import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/note-create.ts";

Deno.test("note-create: POSTs to /{module}/{id}/Notes, nested under the parent record", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "n1" } }] } },
  ]);
  await action.execute(
    { module: "Deals", recordId: "d1", noteTitle: "Call recap", noteContent: "Went well." },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Deals/d1/Notes");
  assertEquals(
    JSON.parse(calls[0].body!),
    { data: [{ Note_Title: "Call recap", Note_Content: "Went well." }] },
  );
});
