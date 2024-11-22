import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";

//Recomended to use when you need to divide BigInt by BigInt to recieve result with decimals
export function BigIntToBigDecimal(target: BigInt): BigDecimal {
  return BigDecimal.fromString(target.toString());
}
export function pow(base: BigDecimal, exponent: BigInt): BigDecimal {
  let result: BigDecimal = BigDecimal.fromString("1");
  for (
    let i: BigInt = BigInt.fromI32(0);
    i.lt(exponent);
    i = i.plus(BigInt.fromI32(1))
  ) {
    result = result.times(base);
  }
  return result;
}
