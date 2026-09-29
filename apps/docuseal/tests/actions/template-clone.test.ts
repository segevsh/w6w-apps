import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-clone.ts";

Deno.test("template-clone: POSTs to the clone endpoint with the optional fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 2, name: "Example (Clone)" } }]);
  const out = await action.execute!({ id: 1, name: "Copy", folderName: "Archive" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/1/clone");
  assertEquals(JSON.parse(calls[0].body!), { name: "Copy", folder_name: "Archive" });
  assertEquals(out, { id: 2, name: "Example (Clone)" });
  assertEquals(action.idempotent, false);
});

Deno.test("template-clone: an empty body is still a valid JSON object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 2 } }]);
  await action.execute!({ id: 1 }, ctx);
  assertEquals(calls[0].body, "{}");
});
