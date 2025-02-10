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
  } else if (network === "real") {
    return "0xB7838d447deece2a9A5794De0f342B47d0c1B9DC";
  } else if (network === "sonic") {
    return "0x4Aca671A420eEB58ecafE83700686a2AD06b20D8";
  }

  throw new Error("Unsupported network");
}

export function getFactoryAddress(network: string): string {
  if (network == "matic") {
    return "0xa14EaAE76890595B3C7ea308dAEBB93863480EAD";
  } else if (network == "base") {
    return "0xe01E62dAe952501e884624423132e50E7B77Ba3c";
  } else if (network === "real") {
    return "0x47331996c42DEF8BD9808888bEeeC945b3424D25";
  } else if (network === "sonic") {
    return "0xc184a3ecca684f2621c903a7943d85fa42f56671";
  }
  throw new Error("Unsupported network");
}

export function getVaultManagerAddress(network: string): string {
  if (network == "matic") {
    return "0x6008b366058B42792A2497972A3312274DC5e1A8";
  } else if (network == "base") {
    return "0x2ba8C6A519CEDB6d1C35cEb14E8642625E91F77C";
  } else if (network === "real") {
    return "0x7146efaab12A083b9826c66162062c21eC70fe3c";
  } else if (network === "sonic") {
    return "0x589a504f2ee9d054b483c700fa814863d639381e";
  }
  throw new Error("Unsupported network");
}

export function getPriceReaderAddress(network: string): string {
  if (network == "matic") {
    return "0xcCef9C4459d73F9A997ff50AC34364555A3274Aa";
  } else if (network == "base") {
    return "0x41408b3e0f279634E3cd59E2D76EF6b149d6D418";
  } else if (network === "real") {
    return "0x6C07D2f01F7640Cb24048a54A85aDeCae12c2408";
  } else if (network === "sonic") {
    return "0x422025182dd83a610bfa8b20550dcccdf94dc549";
  }
  throw new Error("Unsupported network");
}

export function getFrontendContractAddress(network: string): string {
  if (network == "matic") {
    return "0xa9f5593e6a809a24fb41d1d854a577a8bf507e28";
  } else if (network == "base") {
    return "0x995c3bdee2830c7f96d4caa0c36f7b7b8ec60127";
  } else if (network === "real") {
    return "0xfd1361E0565b01B85d3c1511FEf7545D6A84d93a";
  } else if (network === "sonic") {
    return "0x15487495cce9210795f9C2E0e1A7238E336dFc32";
  }
  throw new Error("Unsupported network");
}

export function getSwapperAddress(network: string): string {
  if (network == "matic") {
    return "0xD84E894A6646C7407b8CD1273Ea1EFc53A423762";
  } else if (network == "base") {
    return "0x67e983b3B9f55A1eaA259D58E425e418f3900872";
  } else if (network === "real") {
    return "0xba2C4A1FD42118b48f68305Ba14977FCf82f6C20";
  } else if (network === "sonic") {
    return "0xe52fcf607a8328106723804de1ef65da512771be";
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
  } else if (network === "real") {
    return "0xcA11bde05977b3631167028862bE2a173976CA11";
    //blockCreated: 695
  } else if (network === "sonic") {
    return "0xca11bde05977b3631167028862be2a173976ca11";
    // blockCreated: 60
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
