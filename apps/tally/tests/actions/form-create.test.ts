import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-create.ts";

const BLOCKS = [{ uuid: "b1", type: "FORM_TITLE", payload: { title: "Signup" } }];

Deno.test("form-create: POSTs blocks and status to /forms", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "f1", status: "PUBLISHED" } }]);
  const result = await action.execute({ blocks: BLOCKS, status: "PUBLISHED" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/forms");
  assertEquals(jsonBody(calls[0]), { blocks: BLOCKS, status: "PUBLISHED" });
  assertEquals(result.id, "f1");
});

Deno.test("form-create: forwards the optional placement and settings fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    blocks: BLOCKS,
    status: "DRAFT",
    workspaceId: "w1",
    templateId: "t1",
    folderId: "fo1",
    settings: { language: "nl" },
  }, ctx);

  assertEquals(jsonBody(calls[0]), {
    blocks: BLOCKS,
    status: "DRAFT",
    workspaceId: "w1",
    templateId: "t1",
    folderId: "fo1",
    settings: { language: "nl" },
  });
});

Deno.test("form-create: offers exactly Tally's four documented statuses", () => {
  const status = action.params?.find((p) => p.key === "status");
  assertEquals(
    (status?.options as Array<{ value: string }>).map((o) => o.value),
    ["BLANK", "DRAFT", "PUBLISHED", "DELETED"],
  );
});

Deno.test("form-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
