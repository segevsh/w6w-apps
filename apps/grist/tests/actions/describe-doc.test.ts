import { assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import describeDoc from "../../actions/describe-doc.ts";

Deno.test("describe-doc: GETs the single-doc path and returns its workspace", async () => {
  const { ctx, calls } = actionCtx([{
    body: {
      id: "9PJhBDZ",
      name: "Project Lollipop",
      access: "owners",
      isPinned: false,
      urlId: null,
      workspace: { id: 155, name: "Secret Plans" },
    },
  }]);
  const out = await describeDoc.execute!({ docId: "9PJhBDZ" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/9PJhBDZ");
  assertEquals(out.name, "Project Lollipop");
  assertEquals(out.access, "owners");
  assertEquals((out.workspace as { id: number }).id, 155);
});
