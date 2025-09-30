import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

import {
  OneBigDecimal,
  OneHundredBigDecimal,
  ZeroBigDecimal,
} from "./constants";

export function getPlatformAddress(network: string): string {
  if (network == "matic") {
    return "0xb2a0737ef27b5Cc474D24c779af612159b1c3e60";
  } else if (network == "base") {
    return "0x7eAeE5CfF17F7765d89F4A46b484256929C62312";
  } else if (network === "sonic") {
    return "0x4Aca671A420eEB58ecafE83700686a2AD06b20D8";
  } else if (network === "avalanche") {
    return "0x94ae77b4e2dbF7799f7c41da3F50aBeE12Fde70e";
  }

  throw new Error("Unsupported network");
}

export function getFactoryAddress(network: string): string {
  if (network == "matic") {
    return "0xa14EaAE76890595B3C7ea308dAEBB93863480EAD";
  } else if (network == "base") {
    return "0xe01E62dAe952501e884624423132e50E7B77Ba3c";
  } else if (network === "sonic") {
    return "0xc184a3ecca684f2621c903a7943d85fa42f56671";
  } else if (network === "avalanche") {
    return "0x75954965331d7b9a6fdd2dc024512b8f36da4dbc";
  }
  throw new Error("Unsupported network");
}

export function getMetaVaultsFactoryAddress(network: string): string {
  if (network == "avalanche") {
    return "0x2FA6cc5E1dc2F6Dd8806a3969f2E7fcBf5f75e89";
  } else {
    return "0xa190302880acf9decc4447363640f589000ef601";
  }
}

export function getVaultManagerAddress(network: string): string {
  if (network == "matic") {
    return "0x6008b366058B42792A2497972A3312274DC5e1A8";
  } else if (network == "base") {
    return "0x2ba8C6A519CEDB6d1C35cEb14E8642625E91F77C";
  } else if (network === "sonic") {
    return "0x589a504f2ee9d054b483c700fa814863d639381e";
  } else if (network === "avalanche") {
    return "0xe845fc737fead52fc134d426e5ba0ee0a02b901a";
  }
  throw new Error("Unsupported network");
}

export function getPriceReaderAddress(network: string): string {
  if (network == "matic") {
    return "0xcCef9C4459d73F9A997ff50AC34364555A3274Aa";
  } else if (network == "base") {
    return "0x41408b3e0f279634E3cd59E2D76EF6b149d6D418";
  } else if (network === "sonic") {
    return "0x422025182dd83a610bfa8b20550dcccdf94dc549";
  } else if (network === "avalanche") {
    return "0x0a45e97aceba96650f47da979bde3a8642f26739";
  }
  throw new Error("Unsupported network");
}

export function getFrontendContractAddress(network: string): string {
  if (network == "matic") {
    return "0xa9f5593e6a809a24fb41d1d854a577a8bf507e28";
  } else if (network == "base") {
    return "0x995c3bdee2830c7f96d4caa0c36f7b7b8ec60127";
  } else if (network === "sonic") {
    return "0x15487495cce9210795f9C2E0e1A7238E336dFc32";
  } else if (network === "avalanche") {
    return "0x4377cfeB93448B23Df47d9A8e16cc2c7Cb1b2066";
  }
  throw new Error("Unsupported network");
}

export function getSwapperAddress(network: string): string {
  if (network == "matic") {
    return "0xD84E894A6646C7407b8CD1273Ea1EFc53A423762";
  } else if (network == "base") {
    return "0x67e983b3B9f55A1eaA259D58E425e418f3900872";
  } else if (network === "sonic") {
    return "0xe52fcf607a8328106723804de1ef65da512771be";
  } else if (network === "avalanche") {
    return "0x3222eb4824ceb0e9ccfe11018c83429105dfe00f ";
  }
  throw new Error("Unsupported network");
}

export function getDefiedgeFactoryAddress(network: string): string {
  if (network == "matic") {
    return "0x730d158D29165C55aBF368e9608Af160DD21Bd80";
  } else if (network == "base") {
    return "0xa631c80f5F4739565d8793cAB6fD08812cE3337D";
  }
  throw new Error("Unsupported network");
}

export function getMulticallAddress(network: string): string {
  if (network == "matic") {
    return "0xca11bde05977b3631167028862be2a173976ca11";
    // blockCreated: 25770160
  } else if (network == "base") {
    return "0xca11bde05977b3631167028862be2a173976ca11";
    // blockCreated: 5022
  } else if (network === "sonic") {
    return "0xca11bde05977b3631167028862be2a173976ca11";
    // blockCreated: 60
  } else if (network === "avalanche") {
    return "0xca11bde05977b3631167028862be2a173976ca11";
  }
  throw new Error("Unsupported network");
}

export function calculateVsHoldByPeriod(
  periodAPRs: string[],
  timestamps: BigInt[],
  period: BigDecimal
): string {
  const weights: Array<BigDecimal> = [];
  const APRs: Array<BigDecimal> = [];

  let threshold = ZeroBigDecimal;

  for (let i = 0; i < periodAPRs.length; i++) {
    if (i + 1 == periodAPRs.length) {
      break;
    }
    const diff = BigDecimal.fromString(
      timestamps[i].minus(timestamps[i + 1]).toString()
    );
    if (threshold.plus(diff) <= period) {
      threshold = threshold.plus(diff);
      weights.push(diff.div(period));
    } else {
      const remainingTime = period.minus(threshold);
      weights.push(remainingTime.div(period));
      break;
    }
  }

  for (let i = 0; i < weights.length; i++) {
    APRs.push(BigDecimal.fromString(periodAPRs[i]).times(weights[i]));
  }

  const cumulativeAPR: BigDecimal = APRs.reduce(
    (accumulator: BigDecimal, currentValue: BigDecimal) =>
      accumulator.plus(currentValue),
    ZeroBigDecimal
  );

  return cumulativeAPR.toString();
}
