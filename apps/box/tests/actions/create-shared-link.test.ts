import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-shared-link.ts";

Deno.test("create-shared-link: PUTs /files/{id} with a shared_link body by default", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "1", shared_link: { url: "https://box.com/s/x" } },
  }]);
  await action.execute!({ itemType: "file", itemId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/files/1");
  assertEquals(calls[0].method, "PUT");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.shared_link.access, "open");
  assertEquals(payload.shared_link.permissions, { can_download: true });
});

Deno.test("create-shared-link: routes to /folders/{id} for itemType folder", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ itemType: "folder", itemId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/folders/42");
});

Deno.test("create-shared-link: forwards access, password, canDownload and unsharedAt", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      itemType: "file",
      itemId: "1",
      access: "collaborators",
      password: "s3cret!23",
      canDownload: false,
      unsharedAt: "2027-01-01T00:00:00-08:00",
    },
    ctx,
  );
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.shared_link.access, "collaborators");
  assertEquals(payload.shared_link.password, "s3cret!23");
  assertEquals(payload.shared_link.permissions, { can_download: false });
  assertEquals(payload.shared_link.unshared_at, "2027-01-01T00:00:00-08:00");
});
