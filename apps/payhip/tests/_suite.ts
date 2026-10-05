import { assertEquals, assertRejects } from "@std/assert";
import type { ActionDefinition } from "@w6w/types";
import { KEY, LICENSE, OUT } from "./_fixtures.ts";
import { mockCtx, pathOf } from "./_helpers.ts";

/** The checks every PUT license action must pass: path, form body, v1 variant, empty reply. */
// deno-lint-ignore no-explicit-any
export function putSuite(name: string, action: ActionDefinition<any>, op: string) {
  Deno.test(`${name}: PUT /api/v2/license/${op} with a form body`, async () => {
    const { ctx, calls } = mockCtx([{ body: { data: LICENSE } }]);
    const out = await action.execute(KEY, ctx);
    assertEquals(calls[0].method, "PUT");
    assertEquals(pathOf(calls[0].url), `/api/v2/license/${op}`);
    assertEquals(calls[0].url.includes("?"), false);
    assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
    assertEquals([...new URLSearchParams(calls[0].body!)], [["license_key", KEY.licenseKey]]);
    assertEquals(out, OUT);
  });

  Deno.test(`${name}: legacy v1 adds product_link to the body`, async () => {
    const { ctx, calls } = mockCtx([{ body: { data: LICENSE } }]);
    await action.execute({ ...KEY, apiVersion: "v1", productLink: "mVT0" }, ctx);
    assertEquals(pathOf(calls[0].url), `/api/v1/license/${op}`);
    assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body!)), {
      product_link: "mVT0",
      license_key: KEY.licenseKey,
    });
  });

  Deno.test(`${name}: an empty response throws (the update did not happen)`, async () => {
    const { ctx } = mockCtx([{ body: "" }]);
    await assertRejects(() => Promise.resolve(action.execute(KEY, ctx)), Error, "empty response");
  });
}
