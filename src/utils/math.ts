import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

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

export function decimalPow(base: BigDecimal, exponent: BigDecimal): BigDecimal {
  if (exponent.equals(BigDecimal.fromString("0"))) {
    return BigDecimal.fromString("1");
  }

  if (
    base.equals(BigDecimal.fromString("0")) &&
    exponent.gt(BigDecimal.fromString("0"))
  ) {
    return BigDecimal.fromString("0");
  }

  const exponentFloat = parseFloat(exponent.toString());
  const baseFloat = parseFloat(base.toString());

  if (
    isNaN(baseFloat) ||
    isNaN(exponentFloat) ||
    !isFinite(baseFloat) ||
    !isFinite(exponentFloat)
  ) {
    return BigDecimal.fromString("0");
  }

  if (baseFloat < 0 && exponentFloat % 1 !== 0) {
    return BigDecimal.fromString("0");
  }

  const isIntegerExponent = exponentFloat === Math.floor(exponentFloat);
  if (isIntegerExponent) {
    let result: BigDecimal = BigDecimal.fromString("1");
    const exponentIntFloor = Math.floor(exponentFloat);

    for (let i = 0; i < exponentIntFloor; i++) {
      result = result.times(base);
    }
    return result;
  }

  const resultFloat = Math.pow(baseFloat, exponentFloat);

  if (!isFinite(resultFloat)) {
    return BigDecimal.fromString("0");
  }

  return BigDecimal.fromString(resultFloat.toString());
}
