export function getPlatformAddress(network: string): string {
  if (network == "matic") {
    return "0xb2a0737ef27b5Cc474D24c779af612159b1c3e60";
  } else if (network == "base") {
    return "0x7eAeE5CfF17F7765d89F4A46b484256929C62312";
  } else if (network === "real") {
    return "0xB7838d447deece2a9A5794De0f342B47d0c1B9DC";
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
