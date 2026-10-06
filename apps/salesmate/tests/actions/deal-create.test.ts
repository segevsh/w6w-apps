import { assertEquals } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import create from "../../actions/deal-create.ts";

const B = "https://acme.salesmate.io/apis/deal/v4";
const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

Deno.test("deal-create: POSTs the fields and custom fields at the top level", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ id: 9 })]);
  const out = await create.execute(
    {
      ...{
        "title": "Big",
        "primaryContact": 5,
        "owner": 1,
        "pipeline": "Sales",
        "stage": "New",
        "status": "Open",
      },
      dealValue: 100,
      customFields: '{"textCustomField1":"x"}',
    } as never,
    ctx,
  );
  assertEquals(out, { id: 9 });
  assertEquals(calls[0].url, B);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    textCustomField1: "x",
    ...{
      "title": "Big",
      "primaryContact": 5,
      "owner": 1,
      "pipeline": "Sales",
      "stage": "New",
      "status": "Open",
    },
    dealValue: 100,
  });
});

Deno.test("deal-create: drops unset optional fields rather than sending nulls", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({})]);
  await create.execute(
    {
      ...{
        "title": "Big",
        "primaryContact": 5,
        "owner": 1,
        "pipeline": "Sales",
        "stage": "New",
        "status": "Open",
      },
      tags: "",
    } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "title": "Big",
    "primaryContact": 5,
    "owner": 1,
    "pipeline": "Sales",
    "stage": "New",
    "status": "Open",
  });
});

Deno.test("deal-create: declares the documented required params", () => {
  const required = (create.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["owner", "pipeline", "primaryContact", "stage", "status", "title"]);
});
