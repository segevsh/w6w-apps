import { assertEquals } from "@std/assert";
import storeProfileGet from "../../actions/store-profile-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("store-profile-get: calls GET /profile on the connection's store", async () => {
  const { ctx, calls } = mockCtx([{ body: { settings: { storeName: "Acme" } } }]);
  const out = await storeProfileGet.execute({}, ctx) as { settings: { storeName: string } };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/profile");
  assertEquals(out.settings.storeName, "Acme");
});

Deno.test("store-profile-get: the optional switches are only sent when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await storeProfileGet.execute({ showExtendedInfo: true, lang: "nl" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("showExtendedInfo"),
    "true",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("lang"), "nl");

  const bare = mockCtx([{ body: {} }]);
  await storeProfileGet.execute({}, bare.ctx);
  assertEquals(new URL(bare.calls[0].url).search, "");
});

Deno.test("store-profile-get: extended info is off by default", () => {
  const param = storeProfileGet.params?.find((p) => p.key === "showExtendedInfo");
  assertEquals(param?.default, undefined);
});
