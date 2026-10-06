import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient } from "../lib/client.ts";

interface Input {
  username: string;
  amount: number;
  note?: string;
  dryrun?: boolean;
}

/** `POST /charges.json` */
const createCharge: ActionDefinition<Input> = {
  key: "create-charge",
  type: "perform",
  resource: "charge",
  title: "Create Charge",
  description: "Charge the token's user an arbitrary amount in US dollars (minimum 1.00). " +
    "Moves real money and cannot be undone — use dry run to preview.",
  idempotent: false,
  params: [
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      hint: "The user being charged (the vendor's `user_id`).",
    },
    {
      key: "amount",
      label: "Amount (USD)",
      type: "number",
      required: true,
      validation: { min: 1 },
    },
    { key: "note", label: "Note", type: "string" },
    {
      key: "dryrun",
      label: "Dry run",
      type: "boolean",
      hint: "Return the charge as if created without creating it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Charge ID" },
    { key: "amount", type: "number", label: "Amount (USD)" },
    { key: "note", type: "string", label: "Note" },
    { key: "username", type: "string", label: "Charged user" },
  ],

  async execute(input, ctx) {
    const username = String(input.username ?? "").trim();
    if (!username) throw new Error("username is required");
    const amount = Number(input.amount);
    if (!(amount >= 1)) throw new Error("amount must be at least 1.00 (US dollars)");
    const { data } = await new BeeminderClient(ctx).request("/charges.json", {
      method: "POST",
      form: {
        user_id: username,
        amount,
        note: input.note,
        dryrun: input.dryrun ? "true" : undefined,
      },
    });
    const c = (data ?? {}) as Record<string, unknown>;
    return { id: c.id, amount: c.amount, note: c.note, username: c.username };
  },
};

export default createCharge;
