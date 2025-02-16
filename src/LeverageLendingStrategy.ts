import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";

import { LeverageLendingHardWork as HardWorkEvent } from "../generated/templates/LeverageLendingStrategyData/ILeverageLendingStrategyABI";
import { StrategyBaseABI as StrategyContract } from "../generated/templates/StrategyData/StrategyBaseABI";

import {
  VaultEntity,
  VaultLeverageLendingHistoryEntity,
  VaultLeverageLendingMetricsEntity,
} from "../generated/schema";

import {
  DayInSecondsBigInt,
  OneBigDecimal,
  ZeroBigInt,
} from "./utils/constants";

export function handleLeverageLendingHardWork(event: HardWorkEvent): void {
  const strategyContract = StrategyContract.bind(event.address);

  const vaultAddress = strategyContract.vault();

  const vault = VaultEntity.load(vaultAddress) as VaultEntity;
  const vaultLeverageLendingMetricsEntity = VaultLeverageLendingMetricsEntity.load(
    vaultAddress
  ) as VaultLeverageLendingMetricsEntity;

  vault.realAPR = event.params.realApr;
  vault.save();

  let lastTimestamp = vault.created;

  if (vaultLeverageLendingMetricsEntity.timestamps.length) {
    lastTimestamp =
      vaultLeverageLendingMetricsEntity.timestamps[
        vaultLeverageLendingMetricsEntity.timestamps.length - 1
      ];
  }

  const currentTime = event.block.timestamp;
  const differenceInSecondsFromCreation = currentTime.minus(vault.created);

  let daysFromCreation: string = differenceInSecondsFromCreation
    .div(BigInt.fromI32(60 * 60 * 24))
    .toString();

  if (BigDecimal.fromString(daysFromCreation).lt(OneBigDecimal)) {
    daysFromCreation = "1";
  }

  /***** VaultLeverageLendingHistoryEntity *****/

  let vaultLeverageLendingHistoryEntity = new VaultLeverageLendingHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(vaultAddress.toHexString())
  );
  vaultLeverageLendingHistoryEntity.address = vaultAddress;
  vaultLeverageLendingHistoryEntity.timestamp = event.block.timestamp;
  vaultLeverageLendingHistoryEntity.APR = event.params.realApr;
  vaultLeverageLendingHistoryEntity.save();

  //===========dailyAPR===========//
  let _APRArray = vaultLeverageLendingMetricsEntity.APRS;
  let _timestampsArray = vaultLeverageLendingMetricsEntity.timestamps;

  _APRArray.push(event.params.realApr);
  _timestampsArray.push(event.block.timestamp);

  _APRArray.reverse();
  _timestampsArray.reverse();

  const day = DayInSecondsBigInt;
  let relativeWeek = BigInt.fromI32(604800);

  if (BigInt.fromString(daysFromCreation).lt(BigInt.fromI32(7))) {
    relativeWeek = DayInSecondsBigInt.times(
      BigInt.fromString(daysFromCreation)
    );
  }

  const DENOMINATOR = BigInt.fromI32(100000);

  const dailyAPRs: Array<BigInt> = [];
  const weeklyAPRs: Array<BigInt> = [];

  const dailyWeights: Array<BigInt> = [];
  const weeklyWeights: Array<BigInt> = [];

  let threshold = ZeroBigInt;

  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    if (threshold.plus(diff) <= day) {
      threshold = threshold.plus(diff);
      dailyWeights.push(diff.times(DENOMINATOR).div(day));
    } else {
      const result = day
        .minus(threshold)
        .times(DENOMINATOR)
        .div(day);
      dailyWeights.push(result);
      break;
    }
  }

  for (let i = 0; i < dailyWeights.length; i++) {
    dailyAPRs.push(_APRArray[i].times(dailyWeights[i]));
  }

  let averageDailyAPR = dailyAPRs
    .reduce(
      (accumulator: BigInt, currentValue: BigInt) =>
        accumulator.plus(currentValue),
      ZeroBigInt
    )
    .div(DENOMINATOR);

  //===========weeklyAPR===========//
  threshold = ZeroBigInt;

  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    if (threshold.plus(diff) <= relativeWeek) {
      threshold = threshold.plus(diff);
      weeklyWeights.push(diff.times(DENOMINATOR).div(relativeWeek));
    } else {
      const result = relativeWeek
        .minus(threshold)
        .times(DENOMINATOR)
        .div(relativeWeek);
      weeklyWeights.push(result);
      break;
    }
  }

  for (let i = 0; i < weeklyWeights.length; i++) {
    weeklyAPRs.push(_APRArray[i].times(weeklyWeights[i]));
  }

  let averageWeeklyAPR = weeklyAPRs
    .reduce(
      (accumulator: BigInt, currentValue: BigInt) =>
        accumulator.plus(currentValue),
      ZeroBigInt
    )
    .div(DENOMINATOR);

  if (BigInt.fromString(daysFromCreation).lt(BigInt.fromI32(2))) {
    averageDailyAPR = _APRArray
      .reduce(
        (accumulator: BigInt, currentValue: BigInt) =>
          accumulator.plus(currentValue),
        ZeroBigInt
      )
      .div(BigInt.fromI32(_APRArray.length));
    averageWeeklyAPR = averageDailyAPR;
  }

  vaultLeverageLendingHistoryEntity.APR24H = averageDailyAPR;
  vaultLeverageLendingHistoryEntity.APRWeekly = averageWeeklyAPR;
  vaultLeverageLendingHistoryEntity.save();

  _APRArray.reverse();
  _timestampsArray.reverse();

  vaultLeverageLendingMetricsEntity.APRS = _APRArray;
  vaultLeverageLendingMetricsEntity.timestamps = _timestampsArray;
  vaultLeverageLendingMetricsEntity.save();
}
