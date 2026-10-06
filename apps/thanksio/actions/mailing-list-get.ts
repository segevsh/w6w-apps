import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/mailing-lists/{mailingListId}` */
interface Input {
  mailingListId: string;
}

const mailingListGet: ActionDefinition<Input> = {
  key: "mailing-list-get",
  type: "read",
  resource: "mailing-list",
  title: "Get Mailing List",
  description: "Get a mailing list with its recipient count, scan and send statistics.",
  params: [idParam("mailingListId", "Mailing list ID")],
  output: [{ key: "mailingList", type: "object", label: "The mailing list" }],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call(
      `/mailing-lists/${encodeId(input.mailingListId)}`,
    );
    return { mailingList: body };
  },
};

export default mailingListGet;
