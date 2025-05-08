import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

import {
  Enter as EnterEvent,
  InstantExit as ExitEvent,
  XSTBLABI as XSTBLContract,
} from "../generated/templates/XSTBLData/XSTBLABI";

import { RevenueRouterABI as RevenueRouterContract } from "../generated/templates/XSTBLData/RevenueRouterABI";

import { XStakingABI as XStakingContract } from "../generated/templates/XSTBLData/XStakingABI";

import { XSTBLHistoryEntity } from "../generated/schema";

import {
  xSTBLAddress,
  revenueRouterAddress,
  stakingAddress,
  OneYearInSecondsBigDecimal,
  WeekInSecondsBigInt,
} from "./utils/constants";

export function handleEnter(event: EnterEvent): void {
  // const xSTBLContract = XSTBLContract.bind(Address.fromString(xSTBLAddress));
  // const xStakingContract = XStakingContract.bind(
  //   Address.fromString(stakingAddress)
  // );
  // const revenueRouterContract = RevenueRouterContract.bind(
  //   Address.fromString(revenueRouterAddress)
  // );
  // const totalSupply = xSTBLContract.totalSupply();
  // const pendingRebase = xSTBLContract.pendingRebase();
  // const pendingRevenue = revenueRouterContract.pendingRevenue();
  // const stakeTotalSupply = xStakingContract.totalSupply();
  // const allIncome = pendingRebase.plus(pendingRevenue);
  // const blockTimestamp = event.block.timestamp;
  // const currentWeek = blockTimestamp
  //   .div(WeekInSecondsBigInt)
  //   .plus(BigInt.fromI32(1));
  // const weekTimestamp = currentWeek.times(WeekInSecondsBigInt);
  // const timePassed = blockTimestamp.minus(
  //   weekTimestamp.minus(WeekInSecondsBigInt)
  // );
  // const APR = allIncome
  //   .toBigDecimal()
  //   .div(stakeTotalSupply.toBigDecimal())
  //   .times(OneYearInSecondsBigDecimal.div(timePassed.toBigDecimal()))
  //   .times(BigDecimal.fromString("100"));
  // const xSTBLHistoryEntity = new XSTBLHistoryEntity(event.transaction.hash);
  // xSTBLHistoryEntity.totalSupply = totalSupply;
  // xSTBLHistoryEntity.timestamp = event.block.timestamp;
  // xSTBLHistoryEntity.APR = APR.toString();
  // xSTBLHistoryEntity.save();
}

export function handleExit(event: ExitEvent): void {
  // const xSTBLContract = XSTBLContract.bind(Address.fromString(xSTBLAddress));
  // const xStakingContract = XStakingContract.bind(
  //   Address.fromString(stakingAddress)
  // );
  // const revenueRouterContract = RevenueRouterContract.bind(
  //   Address.fromString(revenueRouterAddress)
  // );
  // const totalSupply = xSTBLContract.totalSupply();
  // const pendingRebase = xSTBLContract.pendingRebase();
  // const pendingRevenue = revenueRouterContract.pendingRevenue();
  // const stakeTotalSupply = xStakingContract.totalSupply();
  // const allIncome = pendingRebase.plus(pendingRevenue);
  // const blockTimestamp = event.block.timestamp;
  // const currentWeek = blockTimestamp
  //   .div(WeekInSecondsBigInt)
  //   .plus(BigInt.fromI32(1));
  // const weekTimestamp = currentWeek.times(WeekInSecondsBigInt);
  // const timePassed = blockTimestamp.minus(
  //   weekTimestamp.minus(WeekInSecondsBigInt)
  // );
  // const APR = allIncome
  //   .toBigDecimal()
  //   .div(stakeTotalSupply.toBigDecimal())
  //   .times(OneYearInSecondsBigDecimal.div(timePassed.toBigDecimal()))
  //   .times(BigDecimal.fromString("100"));
  // const xSTBLHistoryEntity = new XSTBLHistoryEntity(event.transaction.hash);
  // xSTBLHistoryEntity.totalSupply = totalSupply;
  // xSTBLHistoryEntity.timestamp = event.block.timestamp;
  // xSTBLHistoryEntity.APR = APR.toString();
  // xSTBLHistoryEntity.save();
}
