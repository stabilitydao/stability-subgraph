import { LiquidationEntity } from "../../generated/schema";
import { LiquidationCall as LiquidationCallABI } from "../../generated/templates/Pool/PoolABI";

export function handleLiquidationCall(event: LiquidationCallABI): void {
  const id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();

  let entity = new LiquidationEntity(id);
  entity.pool = event.address;
  entity.collateralAsset = event.params.collateralAsset;
  entity.debtAsset = event.params.debtAsset;
  entity.user = event.params.user;
  entity.debtToCover = event.params.debtToCover;
  entity.liquidatedCollateralAmount = event.params.liquidatedCollateralAmount;
  entity.liquidator = event.params.liquidator;
  entity.receiveAToken = event.params.receiveAToken;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
