import { updateAction } from "../lib/factory.ts";
import {
  prospectAttrParams,
  prospectRelFieldParams,
  prospectRelParams,
} from "./prospect-create.ts";

export default updateAction({
  key: "prospect-update",
  title: "Update Prospect",
  noun: "Prospect",
  type: "prospect",
  path: "prospects",
  description: "Update a prospect. Only the fields you supply change.",
  attrParams: prospectAttrParams,
  relParams: prospectRelParams,
  relFieldParams: prospectRelFieldParams,
});
