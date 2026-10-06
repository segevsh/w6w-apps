import { assertEquals, assertRejects } from "@std/assert";
import sequenceStateCreate from "../../actions/sequence-state-create.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("sequence-state-create: relates prospect, sequence and mailbox and sends no attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: single("sequenceState", 11, { state: "active" }),
  }]);
  const out = await sequenceStateCreate.execute(
    { prospectId: 1, sequenceId: 2, mailboxId: 3 },
    ctx,
  ) as { data: { attributes: { state: string } } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/sequenceStates");
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "sequenceState",
      relationships: {
        prospect: { data: { type: "prospect", id: 1 } },
        sequence: { data: { type: "sequence", id: 2 } },
        mailbox: { data: { type: "mailbox", id: 3 } },
      },
    },
  });
  assertEquals(out.data.attributes.state, "active");
});

Deno.test("sequence-state-create: prospect, sequence and mailbox are all required params", () => {
  const required = sequenceStateCreate.params!.filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["prospectId", "sequenceId", "mailboxId"]);
});

Deno.test("sequence-state-create: a malformed id never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await sequenceStateCreate.execute({ prospectId: 1.5, sequenceId: 2, mailboxId: 3 }, ctx),
    Error,
    "prospectId",
  );
  assertEquals(calls.length, 0);
});
