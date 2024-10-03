import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

import {
  getPlatformAddress,
  getFactoryAddress,
  getDefiedgeFactoryAddress,
  getVaultManagerAddress,
  getPriceReaderAddress,
} from "./functions";

const networkToDeploy = "matic"; // matic || base

const addressZero = "0x0000000000000000000000000000000000000000";
const platformAddress = getPlatformAddress(networkToDeploy);
const factoryAddress = getFactoryAddress(networkToDeploy);
const defiedgeFactoryAddress = getDefiedgeFactoryAddress(networkToDeploy);
const vaultManagerAddress = getVaultManagerAddress(networkToDeploy);
const priceReaderAddress = getPriceReaderAddress(networkToDeploy);
const getBalanceAddress = "0x1Ebd614F038a6cED8faBf0Be075995dd1BB549cE";

const oneEther = BigInt.fromI32(10).pow(18);
const ZeroBigInt = BigInt.fromI32(0);
const ZeroBigDecimal = BigDecimal.fromString("0");
const OneBigDecimal = BigDecimal.fromString("1");
const OneHundredBigDecimal = BigDecimal.fromString("100");
const YearBigDecimal = BigDecimal.fromString("365");
const EtherBigDecimal = BigDecimal.fromString("1000000000000000000");
const ichiName = "ichi";

export {
  addressZero,
  platformAddress,
  factoryAddress,
  defiedgeFactoryAddress,
  vaultManagerAddress,
  priceReaderAddress,
  getBalanceAddress,
  oneEther,
  ZeroBigInt,
  ZeroBigDecimal,
  OneBigDecimal,
  OneHundredBigDecimal,
  YearBigDecimal,
  EtherBigDecimal,
  ichiName,
  networkToDeploy,
};
