import {ALMRebalanceEntity} from "../generated/schema"
import {ichiName, priceReaderAddress} from "./constants"
import {Rebalance       as RebalanceEvent} from "../generated/templates/IchiQuickSwapMerklFarmData/IchiQuickSwapMerklFarmABI"
import {IchiQuickSwapMerklFarmABI as IchiContract} from "../generated/templates/IchiQuickSwapMerklFarmData/IchiQuickSwapMerklFarmABI"
import {PriceReaderABI as PriceReaderContract} from "../generated/templates/PriceReaderData/PriceReaderABI"
import { Address, BigInt } from "@graphprotocol/graph-ts"


export function handleRebalance(event: RebalanceEvent): void {
    let ichi = new ALMRebalanceEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    const strategyIchi = IchiContract.bind(event.address);
    const priceReader = PriceReaderContract.bind(Address.fromString(priceReaderAddress));
    const token0 = strategyIchi.token0();
    const token1 = strategyIchi.token1();
    //let massive0: Array<Address> = [token0, token1]
    //let massive1: Array<BigInt> = [event.params.totalAmount0, event.params.totalAmount1]

    const asset0Price = priceReader.VERSION()
/* 
    const asset0Price = priceReader.getPrice(token0).value0
    const asset1Price = priceReader.getPrice(token1).value0 */
/*     const assetsPrices = priceReader.getAssetsPrice(
        massive0, 
        massive1
    ) */

/*     const assetsPrices = priceReader.getAssetsPrice(
        [token0,token1,token0,token1], 
        [event.params.totalAmount0,event.params.totalAmount1,
        event.params.feeAmount0,event.params.feeAmount1]
        ) */

    //const totalUSD = BigInt.fromI32(assetsPrices.value0[0] + assetsPrices.value0[1])
    //const feeUSD = BigInt.fromI32(assetsPrices.value0[2] + assetsPrices.value0[3]) 

    ichi.alm = event.address
    ichi.protocol = ichiName
    ichi.timestamp = event.block.timestamp
    ichi.totalAssets0 = event.params.totalAmount0
    ichi.totalAssets1 = event.params.totalAmount1
    //ichi.totalUSD = totalUSD
    ichi.fee0 = event.params.feeAmount0
    ichi.fee1 = event.params.feeAmount1
    //ichi.feeUSD = feeUSD
    //ichi.test0 = token0
    //ichi.test1 = token1
    //ichi.price0 = asset0Price
    //ichi.price1 = asset1Price
    ichi.test666 = asset0Price;
    ichi.save()
}