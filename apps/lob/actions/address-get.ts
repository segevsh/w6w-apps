import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";

interface Input {
  addressId: string;
}

const addressGet: ActionDefinition<Input> = {
  key: "address-get",
  type: "read",
  resource: "address",
  title: "Get Address",
  description: "Retrieve a saved address by id.",
  params: [{
    key: "addressId",
    label: "Address ID",
    type: "string",
    required: true,
    placeholder: "adr_…",
    hint: "Lob ids start with `adr_`.",
  }],
  output: [
    { key: "id", type: "string", label: "Address ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address_line1", type: "string", label: "Address line 1" },
    { key: "address_city", type: "string", label: "City" },
    { key: "address_state", type: "string", label: "State" },
    { key: "address_zip", type: "string", label: "ZIP" },
    { key: "address_country", type: "string", label: "Country" },
  ],

  execute(input, ctx) {
    return new LobClient(ctx).json(`/addresses/${encodeId(input.addressId)}`);
  },
};

export default addressGet;
