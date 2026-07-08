import { type TronNetwork } from "../services/tron";

export function getWalletParams(event: any) {
  const id = getRouterParam(event, "id");
  const network = (getQuery(event).network || "nile") as TronNetwork;

  if (!id) {
    throw createError({ statusCode: 400, message: "缺少钱包ID" });
  }

  return { id, network };
}
