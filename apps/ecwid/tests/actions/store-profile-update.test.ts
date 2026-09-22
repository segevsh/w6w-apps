import { assertEquals } from "@std/assert";
import storeProfileUpdate from "../../actions/store-profile-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("store-profile-update: PUTs a partial profile body", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  const out = await storeProfileUpdate.execute(
    { settings: { storeName: "Acme", closed: false } },
    ctx,
  ) as { updateCount: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/profile");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    settings: { storeName: "Acme", closed: false },
  });
  assertEquals(out.updateCount, 1);
});

Deno.test("store-profile-update: additional fields are merged over the typed ones", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await storeProfileUpdate.execute(
    {
      settings: { storeName: "Acme" },
      extraFields: '{"registrationAnswers":{"howDidYouHear":"search"}}',
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    settings: { storeName: "Acme" },
    registrationAnswers: { howDidYouHear: "search" },
  });
});

Deno.test("store-profile-update: an untouched field is not sent, so it keeps its value", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await storeProfileUpdate.execute({ languages: { defaultLanguage: "en" } }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { languages: { defaultLanguage: "en" } });
});
