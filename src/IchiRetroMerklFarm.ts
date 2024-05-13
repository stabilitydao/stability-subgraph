import {
  ALMRebalanceHistoryEntity,
  LastFeeAMLEntity,
  VaultEntity,
} from "../generated/schema";
import { ichiName, priceReaderAddress, ZeroBigInt } from "./constants";

import {
  Rebalance as RebalanceEvent,
  IchiRetroMerklFarmDataABI as IchiRetroContract,
} from "../generated/templates/IchiRetroMerklFarmData/IchiRetroMerklFarmDataABI";

import { PriceReaderABI as PriceReaderContract } from "../generated/templates/IchiQuickSwapMerklFarmData/PriceReaderABI";
import { Address, BigInt } from "@graphprotocol/graph-ts";

export function handleRebalance(event: RebalanceEvent): void {
  const _id = event.transaction.hash.concatI32(event.logIndex.toI32());

  let _ichi = new ALMRebalanceHistoryEntity(_id);
  const strategyIchi = IchiRetroContract.bind(event.address);
  const priceReader = PriceReaderContract.bind(
    Address.fromString(priceReaderAddress)
  );
  const token0 = strategyIchi.token0();
  const token1 = strategyIchi.token1();

  const assetsPrices = priceReader.getAssetsPrice(
    [token0, token1, token0, token1],
    [
      event.params.totalAmount0,
      event.params.totalAmount1,
      event.params.feeAmount0,
      event.params.feeAmount1,
    ]
  );

  const totalUSD = assetsPrices.value1[0].plus(assetsPrices.value1[1]);
  const feeUSD = assetsPrices.value1[2].plus(assetsPrices.value1[3]);

  //===========24HAPR===========//

  const lastEvent = LastFeeAMLEntity.load(event.address) as LastFeeAMLEntity;

  let _APRArray = lastEvent.APRS;
  let _timestampsArray = lastEvent.timestamps;

  const day = BigInt.fromI32(86400);
  const year = BigInt.fromI64(31536000);
  const DENOMINATOR = BigInt.fromI64(100000);
  let APR = feeUSD.times(DENOMINATOR).times(year).div(totalUSD);

  _timestampsArray.push(event.block.timestamp);
  _APRArray.push(APR);

  _APRArray = _APRArray.reverse();
  _timestampsArray = _timestampsArray.reverse();

  let threshold = ZeroBigInt;
  let weights: Array<BigInt> = [];
  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    if (threshold.plus(diff) <= day) {
      threshold = threshold.plus(diff);
      weights.push(diff.times(DENOMINATOR).div(day));
    } else {
      const result = day.minus(threshold).times(DENOMINATOR).div(day);
      weights.push(result);
      break;
    }
  }

  let APRS: Array<BigInt> = [];

  for (let i = 0; i < weights.length; i++) {
    APRS.push(_APRArray[i].times(weights[i]));
  }

  let averageAPR24H = APRS.reduce(
    (accumulator: BigInt, currentValue: BigInt) =>
      accumulator.plus(currentValue),
    ZeroBigInt
  );
  averageAPR24H = averageAPR24H.div(DENOMINATOR);

  //===========WeeklyAPR===========//

  const week = BigInt.fromI32(604800);
  threshold = ZeroBigInt;
  let weightsWeeklyAPR: Array<BigInt> = [];
  for (let i = 0; i < _APRArray.length; i++) {
    if (i + 1 == _APRArray.length) {
      break;
    }
    const diff = _timestampsArray[i].minus(_timestampsArray[i + 1]);
    if (threshold.plus(diff) <= week) {
      threshold = threshold.plus(diff);
      weightsWeeklyAPR.push(diff.times(DENOMINATOR).div(week));
    } else {
      const result = week.minus(threshold).times(DENOMINATOR).div(week);
      weightsWeeklyAPR.push(result);
      break;
    }
  }

  let WeeklyAPRS: Array<BigInt> = [];

  for (let i = 0; i < weightsWeeklyAPR.length; i++) {
    WeeklyAPRS.push(_APRArray[i].times(weightsWeeklyAPR[i]));
  }

  let averageWeeklyAPR = WeeklyAPRS.reduce(
    (accumulator: BigInt, currentValue: BigInt) =>
      accumulator.plus(currentValue),
    ZeroBigInt
  );

  _ichi.APRWeekly = averageWeeklyAPR.div(DENOMINATOR);

  _APRArray = _APRArray.reverse();
  _timestampsArray = _timestampsArray.reverse();

  lastEvent.APRS = _APRArray;
  lastEvent.timestamps = _timestampsArray;
  lastEvent.save();

  _ichi.alm = event.address;
  _ichi.protocol = ichiName;
  _ichi.timestamp = event.block.timestamp;
  _ichi.totalAssets0 = event.params.totalAmount0;
  _ichi.totalAssets1 = event.params.totalAmount1;
  _ichi.fee0 = event.params.feeAmount0;
  _ichi.fee1 = event.params.feeAmount1;
  _ichi.totalUSD = totalUSD;
  _ichi.feeUSD = feeUSD;
  _ichi.isRebalance = true;
  _ichi.APRFromLastEvent = APR;
  _ichi.APR24H = averageAPR24H;
  _ichi.save();

  //===========almRebalanceEntity(VaultEntity)===========//
  const vault = VaultEntity.load(lastEvent.vault) as VaultEntity;
  let _almRebalanceEntity = vault.almRebalanceHistoryEntity;

  if (_almRebalanceEntity) {
    _almRebalanceEntity.push(_id);
  } else {
    _almRebalanceEntity = [];
    _almRebalanceEntity.push(_id);
  }

  vault.almRebalanceHistoryEntity = _almRebalanceEntity;
  vault.save();
}
