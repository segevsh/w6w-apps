import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-create.ts";

Deno.test("release-create: POSTs /projects/{id}/releases", async () => {
  const { ctx, calls } = mockCtx([{ body: { tag_name: "v1.0.0" } }]);
  await action.execute(
    { projectId: "1", tagName: "v1.0.0", name: "1.0", ref: "main" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/1/releases");
  assertEquals(JSON.parse(calls[0].body!), { tag_name: "v1.0.0", name: "1.0", ref: "main" });
});

Deno.test("release-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
