import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import archiveImage from "../../actions/archive-image.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("archive-image: POSTs /images/media/{id}/archive", async () => {
  const { ctx, calls } = mockCtx([{ body: { savedMediaId: "media1", archived: true } }]);
  const out = await archiveImage.execute({ savedMediaId: "media1" }, ctx) as {
    archived: boolean;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1.0/images/media/media1/archive");
  assertEquals(out.archived, true);
});

test("archive-image: is declared idempotent, matching the vendor's own guarantee", () => {
  assertEquals(archiveImage.idempotent, true);
});
