import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  voucherSeries: string;
  voucherNumber: number;
  financialYear?: string;
}

const voucherGet: ActionDefinition<Input> = {
  key: "voucher-get",
  type: "read",
  resource: "voucher",
  title: "Get Voucher",
  description:
    "Fetch one voucher by series and number. The same series and number repeat every year, so pass the financial year id.",
  params: [
    {
      "key": "voucherSeries",
      "label": "Voucher series",
      "type": "string",
      "required": true,
    },
    {
      "key": "voucherNumber",
      "label": "Voucher number",
      "type": "number",
      "required": true,
    },
    {
      "key": "financialYear",
      "label": "Financial year id",
      "type": "string",
    },
  ],
  output: [
    {
      "key": "Voucher",
      "type": "object",
      "label": "Voucher record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(
      `/3/vouchers/${seg(input.voucherSeries)}/${seg(input.voucherNumber)}`,
      { financialyear: input.financialYear },
    );
  },
};

export default voucherGet;
