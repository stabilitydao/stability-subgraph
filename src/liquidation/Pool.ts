import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  LiquidationEntity,
  ReserveHistoryEntity,
} from "../../generated/schema";

import {
  Supply as SupplyEvent,
  Withdraw as WithdrawEvent,
  Borrow as BorrowEvent,
  Repay as RepayEvent,
  FlashLoan as FlashLoanEvent,
  LiquidationCall as LiquidationCallABI,
  PoolABI,
} from "../../generated/templates/Pool/PoolABI";

import { ERC20 } from "../../generated/templates/Pool/ERC20";
import { PoolAddressProviderABI as PoolAddressProvider } from "../../generated/templates/PoolAddressProvider/PoolAddressProviderABI";
import { PriceOracle } from "../../generated/templates/Pool/PriceOracle";

import {
  shouldSnapshot,
  updateSnapshotTimestamp,
  SNAPSHOT_INTERVAL,
} from "./snapshotHelpers";

/* ───────────────────────── EVENTS ───────────────────────── */

export function handleSupply(event: SupplyEvent): void {
  snapshotReserveData(event);
}

export function handleWithdraw(event: WithdrawEvent): void {
  snapshotReserveData(event);
}

export function handleBorrow(event: BorrowEvent): void {
  snapshotReserveData(event);
}

export function handleRepay(event: RepayEvent): void {
  snapshotReserveData(event);
}

export function handleFlashLoan(event: FlashLoanEvent): void {
  snapshotReserveData(event);
}

export function handleLiquidationCall(event: LiquidationCallABI): void {
  const id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();

  let entity = LiquidationEntity.load(id);
  if (entity == null) {
    entity = new LiquidationEntity(id);
  }
  entity.pool = event.address;
  entity.user = event.params.user;
  entity.liquidator = event.params.liquidator;
  entity.collateralAsset = event.params.collateralAsset;
  entity.debtAsset = event.params.debtAsset;
  entity.liquidatedCollateralAmount = event.params.liquidatedCollateralAmount;
  entity.debtToCover = event.params.debtToCover;
  entity.receiveAToken = event.params.receiveAToken;

  const pool = PoolABI.bind(event.address);
  const provider = PoolAddressProvider.bind(pool.ADDRESSES_PROVIDER());
  const oracle = PriceOracle.bind(provider.getPriceOracle());

  const collateralPrice = oracle.try_getAssetPrice(
    event.params.collateralAsset
  );
  const debtPrice = oracle.try_getAssetPrice(event.params.debtAsset);

  entity.collateralAssetPrice = collateralPrice.reverted
    ? BigInt.zero()
    : collateralPrice.value;

  entity.debtAssetPrice = debtPrice.reverted ? BigInt.zero() : debtPrice.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function snapshotReserveData(event: ethereum.Event): void {
  if (!shouldSnapshot(event.block.timestamp)) {
    return;
  }

  const pool = PoolABI.bind(event.address);
  const reserves = pool.getReservesList();

  const bucket = event.block.timestamp.div(SNAPSHOT_INTERVAL);
  const snapshotTimestamp = bucket.times(SNAPSHOT_INTERVAL);

  for (let i = 0; i < reserves.length; i++) {
    const reserve = reserves[i];
    const id = reserve.toHex() + "-" + bucket.toString();

    let entity = ReserveHistoryEntity.load(id);
    if (entity != null) {
      continue; 
    }

    const reserveData = pool.try_getReserveData(reserve);
    if (reserveData.reverted) {
      continue;
    }

    const data = reserveData.value;

    const aToken = ERC20.bind(data.aTokenAddress);
    const stableDebtToken = ERC20.bind(data.stableDebtTokenAddress);
    const variableDebtToken = ERC20.bind(data.variableDebtTokenAddress);

    const supplyResult = aToken.try_totalSupply();
    const supply = supplyResult.reverted ? BigInt.zero() : supplyResult.value;

    const stableDebtResult = stableDebtToken.try_totalSupply();
    const stableDebt = stableDebtResult.reverted
      ? BigInt.zero()
      : stableDebtResult.value;

    const variableDebtResult = variableDebtToken.try_totalSupply();
    const variableDebt = variableDebtResult.reverted
      ? BigInt.zero()
      : variableDebtResult.value;

    const totalDebt = stableDebt.plus(variableDebt);

    let utilization = BigInt.zero();
    if (supply.gt(BigInt.zero())) {
      utilization = totalDebt.times(BigInt.fromI32(10).pow(18)).div(supply);
    }

    // Create new snapshot entity
    entity = new ReserveHistoryEntity(id);
    entity.timestamp = snapshotTimestamp;
    entity.pool = event.address;
    entity.reserve = reserve;
    entity.totalSupply = supply;
    entity.totalStableDebt = stableDebt;
    entity.totalVariableDebt = variableDebt;
    entity.totalDebt = totalDebt;
    entity.utilization = utilization;

    entity.liquidityRate = data.currentLiquidityRate;
    entity.stableBorrowRate = data.currentStableBorrowRate;
    entity.variableBorrowRate = data.currentVariableBorrowRate;

    entity.liquidityIndex = data.liquidityIndex;
    entity.variableBorrowIndex = data.variableBorrowIndex;

    entity.lastUpdateTimestamp = data.lastUpdateTimestamp;

    entity.save();
  }

  updateSnapshotTimestamp(event.block.timestamp);
}
