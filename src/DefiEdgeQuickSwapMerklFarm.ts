import { LastFeeAMLEntity } from "../generated/schema";
import { PriceReaderABI as PriceReaderContract } from "../generated/templates/IchiQuickSwapMerklFarmData/PriceReaderABI";
import {
  Rebalance as RebalanceEvent,
  DefiEdgeQuickSwapMerklFarmDataABI as DefiEdgeContract,
} from "../generated/templates/DefiEdgeQuickSwapMerklFarmData/DefiEdgeQuickSwapMerklFarmDataABI";

export function handleRebalance(event: RebalanceEvent): void {}
