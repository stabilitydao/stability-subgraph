import {ALMRebalanceEntity, LastFeeAMLEntity} from "../generated/schema"
import {ichiName, priceReaderAddress, ZeroBigInt} from "./constants"
import {BigIntToBigDecimal} from "./math"

import {Rebalance                   as RebalanceEvent,
        CollectFees                 as CollectFeesEvent,
        IchiQuickSwapMerklFarmABI   as IchiContract
} from "../generated/templates/IchiQuickSwapMerklFarmData/IchiQuickSwapMerklFarmABI"

import {PriceReaderABI as PriceReaderContract} from "../generated/templates/IchiQuickSwapMerklFarmData/PriceReaderABI"
import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts"


export function handleRebalance(event: RebalanceEvent): void {
    let ichi = new ALMRebalanceEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    const strategyIchi = IchiContract.bind(event.address);
    const priceReader = PriceReaderContract.bind(Address.fromString(priceReaderAddress));
    const token0 = strategyIchi.token0();
    const token1 = strategyIchi.token1();

    const assetsPrices = priceReader.getAssetsPrice(
        [token0,token1,token0,token1], 
        [event.params.totalAmount0,event.params.totalAmount1,
        event.params.feeAmount0,event.params.feeAmount1]
    )

    const totalUSD = assetsPrices.value1[0].plus(assetsPrices.value1[1]) 
    const feeUSD = assetsPrices.value1[2].plus(assetsPrices.value1[3]) 

    const lastEvent = LastFeeAMLEntity.load(event.address) as LastFeeAMLEntity

    let _APRArray = lastEvent.APRS
    let _timestampsArray = lastEvent.timestamps

    const day = BigInt.fromI32(86400)
    const year = BigInt.fromI64(525600)
    const DENOMINATOR = BigInt.fromI64(100000)
    const MinutesFromLastEvent = (event.block.timestamp.minus(_timestampsArray[_timestampsArray.length-1])).div(BigInt.fromI32(60))
    let APR = feeUSD.times(DENOMINATOR).times(year).div(totalUSD).div(MinutesFromLastEvent)

    _timestampsArray.push(event.block.timestamp)
    _APRArray.push(APR)

    _APRArray = _APRArray.reverse()
    _timestampsArray= _timestampsArray.reverse()

    let threshold = ZeroBigInt
    let weights: Array<BigInt> = []
    for (let i = 0; i < _APRArray.length; i++){
        if(i+1 == _APRArray.length){break}
        const diff = _timestampsArray[i].minus(_timestampsArray[i+1])
        if(threshold.plus(diff) <= day){
            threshold = threshold.plus(diff)
            weights.push(diff.times(DENOMINATOR).div(day))
        } else {
            const result = (day.minus(threshold)).times(DENOMINATOR).div(day)
            weights.push(result)
            break
        }
    }

    let APRS: Array<BigInt> = []
    
    for (let i = 0; i < weights.length; i++){
        APRS.push(_APRArray[i].times(weights[i]))
    } 

    let acc = APRS.reduce((accumulator:BigInt, currentValue:BigInt) => accumulator.plus(currentValue), ZeroBigInt);

    let averageAPR24H = ZeroBigInt
    if(APRS.length > 0){
      averageAPR24H = acc.div(BigInt.fromI32(APRS.length))
    }

    
    _APRArray = _APRArray.reverse()
    _timestampsArray= _timestampsArray.reverse()

    lastEvent.APRS = _APRArray
    lastEvent.timestamps = _timestampsArray
    lastEvent.save()
        
    ichi.alm = event.address
    ichi.protocol = ichiName
    ichi.timestamp = event.block.timestamp
    ichi.totalAssets0 = event.params.totalAmount0
    ichi.totalAssets1 = event.params.totalAmount1
    ichi.fee0 = event.params.feeAmount0
    ichi.fee1 = event.params.feeAmount1 
    ichi.totalUSD = totalUSD
    ichi.feeUSD = feeUSD
    ichi.isRebalance = true
    ichi.APRFromLastEvent = APR
    ichi.APR24H = averageAPR24H
    ichi.save()


} 

export function handleCollectFees(event: CollectFeesEvent): void {
    let ichi = new ALMRebalanceEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    const strategyIchi = IchiContract.bind(event.address);
    const priceReader = PriceReaderContract.bind(Address.fromString(priceReaderAddress));
    const token0 = strategyIchi.token0();
    const token1 = strategyIchi.token1();

    const tokensAmount = strategyIchi.getTotalAmounts();
    const assetsPrices = priceReader.getAssetsPrice(
        [token0,token1,token0,token1], 
        [tokensAmount.value0, tokensAmount.value1,
        event.params.feeAmount0,event.params.feeAmount1]
    )

    const totalUSD = assetsPrices.value1[0].plus(assetsPrices.value1[1]) 
    const feeUSD = assetsPrices.value1[2].plus(assetsPrices.value1[3]) 

    const lastEvent = LastFeeAMLEntity.load(event.address) as LastFeeAMLEntity

    let _APRArray = lastEvent.APRS
    let _timestampsArray = lastEvent.timestamps

    const day = BigInt.fromI32(86400)
    const year = BigInt.fromI64(525600)
    const DENOMINATOR = BigInt.fromI64(100000)
    const MinutesFromLastEvent = (event.block.timestamp.minus(_timestampsArray[_timestampsArray.length-1])).div(BigInt.fromI32(60))
    let APR = feeUSD.times(DENOMINATOR).times(year).div(totalUSD).div(MinutesFromLastEvent)

    _timestampsArray.push(event.block.timestamp)
    _APRArray.push(APR)

    _APRArray = _APRArray.reverse()
    _timestampsArray= _timestampsArray.reverse()

    let threshold = ZeroBigInt
    let weights: Array<BigInt> = []
    for (let i = 0; i < _APRArray.length; i++){
        if(i+1 == _APRArray.length){break}
        const diff = _timestampsArray[i].minus(_timestampsArray[i+1])
        if(threshold.plus(diff) <= day){
            threshold = threshold.plus(diff)
            weights.push(diff.times(DENOMINATOR).div(day))
        } else {
            const result = (day.minus(threshold)).times(DENOMINATOR).div(day)
            weights.push(result)
            break
        }
    }

    let APRS: Array<BigInt> = []
    
    for (let i = 0; i < weights.length; i++){
        APRS.push(_APRArray[i].times(weights[i]))
    } 

    let acc = APRS.reduce((accumulator:BigInt, currentValue:BigInt) => accumulator.plus(currentValue), ZeroBigInt);

    let averageAPR24H = ZeroBigInt
    if(APRS.length > 0){
      averageAPR24H = acc.div(BigInt.fromI32(APRS.length))
    }

    
    _APRArray = _APRArray.reverse()
    _timestampsArray= _timestampsArray.reverse()

    lastEvent.APRS = _APRArray
    lastEvent.timestamps = _timestampsArray
    lastEvent.save()
    
    ichi.alm = event.address
    ichi.protocol = ichiName
    ichi.timestamp = event.block.timestamp
    ichi.totalAssets0 = tokensAmount.value0
    ichi.totalAssets1 = tokensAmount.value1
    ichi.fee0 = event.params.feeAmount0
    ichi.fee1 = event.params.feeAmount1
    ichi.totalUSD = totalUSD
    ichi.feeUSD = feeUSD
    ichi.isRebalance = false
    ichi.APRFromLastEvent = APR
    ichi.APR24H = averageAPR24H
    ichi.save()
} 
