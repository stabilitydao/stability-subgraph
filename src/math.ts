import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts"

//Recomended to use when you need to divide BigInt by BigInt to recieve result with decimals
export function BigIntToBigDecimal(target: BigInt): BigDecimal {
   return BigDecimal.fromString(target.toString())
} 
