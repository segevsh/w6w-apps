import { assert, assertEquals, assertRejects } from "@std/assert";
import listsCreate from "../../actions/lists-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lists-create: POSTs to /v2/lists/ with the technologies filter, free", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "lst_abcdef", status: "Calculating" } }]);
  const out = await listsCreate.execute(
    { technologies: JSON.stringify([{ slug: "shopify" }]) },
    ctx,
  ) as { id: string; status: string };

  assertEquals(pathOf(calls[0].url), "/v2/lists/");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { technologies: [{ slug: "shopify" }] });
  assertEquals(out.id, "lst_abcdef");
  assertEquals(out.status, "Calculating");
});

Deno.test("lists-create: array params are cleaned and joined; company sizes become numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "lst_abcdef", status: "Calculating" } }]);
  await listsCreate.execute(
    {
      categories: ["payment-processors", " ecommerce "],
      keywords: ["fashion"],
      companySizes: ["1001", "5000"],
      matchTechnologies: "or",
      subdomains: "merge",
      format: "json",
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.categories, ["payment-processors", "ecommerce"]);
  assertEquals(body.keywords, ["fashion"]);
  assertEquals(body.companySizes, [1001, 5000]);
  assertEquals(body.matchTechnologies, "or");
  assertEquals(body.subdomains, "merge");
  assertEquals(body.format, "json");
});

Deno.test("lists-create: unset optional fields are dropped from the body, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "lst_abcdef", status: "Calculating" } }]);
  await listsCreate.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("lists-create: invalid technologies JSON throws instead of sending garbage", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await listsCreate.execute({ technologies: "{not json" }, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("lists-create: is marked not idempotent — retrying would create a second list", () => {
  assertEquals(listsCreate.idempotent, false);
});

Deno.test("lists-create: technologies is a free-form json param, not a generated form", () => {
  const p = listsCreate.params?.find((param) => param.key === "technologies");
  assertEquals(p?.type, "json");
  assert(!p?.required);
});
