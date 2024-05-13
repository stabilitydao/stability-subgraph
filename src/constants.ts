import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

const addressZero = "0x0000000000000000000000000000000000000000";
const platformAddress = "0xb2a0737ef27b5cc474d24c779af612159b1c3e60";
const factoryAddress = "0xa14EaAE76890595B3C7ea308dAEBB93863480EAD";
const defiedgeFactoryAddress = "0x730d158D29165C55aBF368e9608Af160DD21Bd80";
const vaultManagerAddress = "0x6008b366058B42792A2497972A3312274DC5e1A8";
const priceReaderAddress = "0xcCef9C4459d73F9A997ff50AC34364555A3274Aa";
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
};
