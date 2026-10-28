import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-get-thumbnail.ts";

Deno.test("page-get-thumbnail: GETs the thumbnail sub-path with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { contentUrl: "https://…", width: 800, height: 450 } }]);
  await action.execute({ presentationId: "p1", pageObjectId: "g1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v1/presentations/p1/pages/g1/thumbnail");
  assertEquals(url.search, "");
});

Deno.test("page-get-thumbnail: uses the dotted thumbnailProperties query names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", pageObjectId: "g1", mimeType: "PNG", thumbnailSize: "MEDIUM" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("thumbnailProperties.mimeType"), "PNG");
  assertEquals(url.searchParams.get("thumbnailProperties.thumbnailSize"), "MEDIUM");
});

Deno.test("page-get-thumbnail: offers only the sizes the enum defines", () => {
  const size = (action.params ?? []).find((p) => p.key === "thumbnailSize");
  assertEquals(
    (size?.options as Array<{ value: string }>).map((o) => o.value),
    ["LARGE", "MEDIUM", "SMALL", "WIDTH2000_PX"],
  );
  const mime = (action.params ?? []).find((p) => p.key === "mimeType");
  assertEquals((mime?.options as Array<{ value: string }>).map((o) => o.value), ["PNG"]);
});

Deno.test("page-get-thumbnail: is a read, not a perform", () => {
  assertEquals(action.type, "read");
});
