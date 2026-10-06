import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { cancelOutput } from "../lib/params.ts";

interface Input {
  addressId: string;
}

const addressDelete: ActionDefinition<Input> = {
  key: "address-delete",
  type: "perform",
  resource: "address",
  title: "Delete Address",
  description:
    "Permanently delete a saved address from the address book. Mailpieces already created from it are unaffected.",
  idempotent: true,
  params: [{
    key: "addressId",
    label: "Address ID",
    type: "string",
    required: true,
    placeholder: "adr_…",
    hint: "Lob ids start with `adr_`.",
  }],
  output: cancelOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/addresses/${encodeId(input.addressId)}`, { method: "DELETE" });
  },
};

export default addressDelete;
