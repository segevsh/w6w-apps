import { assertEquals } from "@std/assert";
import folderCreate from "../../actions/folder-create.ts";
import { envelope, mockCtx, pathOf, usConnection } from "../_helpers.ts";

Deno.test("folder-create: POSTs folderName and parentFolderId", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 201, body: envelope({ folderId: "f2", folderName: "new" }) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await folderCreate.execute(
    { folderName: "new", parentFolderId: "f1" },
    ctx,
  ) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/folders");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { folderName: "new", parentFolderId: "f1" });
  assertEquals(out, { folderId: "f2", folderName: "new" });
});

Deno.test("folder-create: omits parentFolderId when not given", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 201, body: envelope({ folderId: "f3", folderName: "top" }) }],
    usConnection(),
  );
  await folderCreate.execute({ folderName: "top" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { folderName: "top" });
});

Deno.test("folder-create: is not idempotent", () => {
  assertEquals(folderCreate.idempotent, false);
});
