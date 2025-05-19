import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

import { NETWORK } from "./network";

import {
  getPlatformAddress,
  getFactoryAddress,
  getVaultManagerAddress,
  getPriceReaderAddress,
  getDefiedgeFactoryAddress,
  getFrontendContractAddress,
  getSwapperAddress,
  getMulticallAddress,
} from "./functions";

const addressZero = "0x0000000000000000000000000000000000000000";
const platformAddress = getPlatformAddress(NETWORK);
const frontendAddress = getFrontendContractAddress(NETWORK);
const factoryAddress = getFactoryAddress(NETWORK);
const vaultManagerAddress = getVaultManagerAddress(NETWORK);
const priceReaderAddress = getPriceReaderAddress(NETWORK);
const swapperAddress = getSwapperAddress(NETWORK);
const multicallAddress = getMulticallAddress(NETWORK);

const metaVaultFactoryAddress = "0xa190302880acf9decc4447363640f589000ef601";

let defiedgeFactoryAddress = addressZero;

if (NETWORK != "sonic") {
  defiedgeFactoryAddress = getDefiedgeFactoryAddress(NETWORK);
}

const getBalanceAddress = "0x1Ebd614F038a6cED8faBf0Be075995dd1BB549cE";

const xSTBLAddress = "0x902215dd96a291b256a3aef6c4dee62d2a9b80cb";

const revenueRouterAddress = "0x23b8cc22c4c82545f4b451b11e2f17747a730810";

const stakingAddress = "0x17a7cf838a7c91de47552a9f65822b547f9a6997";

const oneEther = BigInt.fromI32(10).pow(18);
const ZeroBigInt = BigInt.fromI32(0);
const OneBigInt = BigInt.fromI32(1);
const ContractPaginationBigInt = BigInt.fromI32(20);
const ZeroBigDecimal = BigDecimal.fromString("0");
const OneBigDecimal = BigDecimal.fromString("1");
const WeeksBigDecimal = BigDecimal.fromString("52");
const DayInSecondsBigDecimal = BigDecimal.fromString("86400");
const DayInSecondsBigInt = BigInt.fromI32(86400);
const WeekInSecondsBigDecimal = BigDecimal.fromString("604800");
const WeekInSecondsBigInt = BigInt.fromI32(604800);
const OneYearInSecondsBigDecimal = BigDecimal.fromString("31536000");
const OneHundredBigDecimal = BigDecimal.fromString("100");
const YearBigDecimal = BigDecimal.fromString("365");
const EtherBigDecimal = BigDecimal.fromString("1000000000000000000");
const ichiName = "ichi";

export {
  addressZero,
  platformAddress,
  factoryAddress,
  vaultManagerAddress,
  priceReaderAddress,
  getBalanceAddress,
  oneEther,
  ZeroBigInt,
  ZeroBigDecimal,
  OneBigDecimal,
  WeeksBigDecimal,
  OneHundredBigDecimal,
  YearBigDecimal,
  EtherBigDecimal,
  ichiName,
  defiedgeFactoryAddress,
  DayInSecondsBigDecimal,
  WeekInSecondsBigDecimal,
  DayInSecondsBigInt,
  OneBigInt,
  ContractPaginationBigInt,
  frontendAddress,
  swapperAddress,
  multicallAddress,
  xSTBLAddress,
  revenueRouterAddress,
  stakingAddress,
  WeekInSecondsBigInt,
  OneYearInSecondsBigDecimal,
  metaVaultFactoryAddress,
};
