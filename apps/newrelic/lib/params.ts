import type { Param } from "@w6w/types";

/** The account id nearly every NerdGraph query needs. */
export const ACCOUNT_PARAM: Param = {
  key: "accountId",
  label: "Account",
  type: "string",
  default: "",
  hint: "Defaults to the connection's account. A user key can see several, so this is not " +
    "implied by the credential — `account-list` shows which.",
};

/** An entity GUID, which is what NerdGraph addresses everything by. */
export function guidParam(label: string, hint: string): Param {
  return {
    key: "guid",
    label,
    type: "string",
    required: true,
    default: "",
    hint,
  };
}
