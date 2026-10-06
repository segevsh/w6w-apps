import action from "../../actions/delete-recipient.ts";
import { testDeleteById } from "../_shapes.ts";

testDeleteById("delete-recipient", action, "recipientId", "/v1/recipients/{id}", 204);
