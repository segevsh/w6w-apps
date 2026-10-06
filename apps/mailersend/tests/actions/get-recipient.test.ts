import action from "../../actions/get-recipient.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-recipient", action, "recipientId", "/v1/recipients/{id}");
