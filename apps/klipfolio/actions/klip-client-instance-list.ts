import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, listResult, seg } from "../lib/client.ts";

interface Input {
  klip_id: string;
}

/** `GET /klips/{klip_id}/client-instances`. */
const klipClientInstanceList: ActionDefinition<Input> = {
  key: "klip-client-instance-list",
  type: "read",
  resource: "klip",
  title: "List Klip Client Instances",
  description: "List the client instances of a Klip (partner accounts).",
  params: [
    { key: "klip_id", label: "Klip ID", type: "string", required: true },
  ],
  output: [
    { key: "items", type: "array", label: "Result rows" },
    { key: "count", type: "number", label: "Rows in this page" },
    { key: "total", type: "number", label: "Total rows" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "GET",
      `/klips/${seg(input.klip_id)}/client-instances`,
    );
    return listResult(env);
  },
};

export default klipClientInstanceList;
