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

    const lastEvent = LastFeeAMLEntity.load(event.address)
    let APR = BigDecimal.fromString("0")
    let averageAPR24H = BigIntToBigDecimal(ZeroBigInt)        
    if(lastEvent){
        const timeDiff = BigIntToBigDecimal((event.block.timestamp.minus(lastEvent.lastFeeClaimTimestamp)).div(BigInt.fromI32(60)))
        const _feeUSD = BigIntToBigDecimal(feeUSD)
        const _totalUSD = BigIntToBigDecimal(totalUSD)
        const minutesInYear = BigIntToBigDecimal(BigInt.fromI32(525600))
        const hundred = BigIntToBigDecimal(BigInt.fromI32(100))
        APR = _feeUSD.div(_totalUSD).div(timeDiff).times(minutesInYear).times(hundred)

        let APRS24HArray = lastEvent.APRS24H
        let RebalanceTimestamps = lastEvent.RebalanceTimestamps
        APRS24HArray.push(APR)
        RebalanceTimestamps.push(event.block.timestamp)

        let allAPRsumm = BigIntToBigDecimal(ZeroBigInt)

        const threshold = event.block.timestamp.minus(BigInt.fromI32(86400)) //1 day
        
        for (let i = 0; i < APRS24HArray.length; i++) {
            if(threshold > RebalanceTimestamps[i]){
                APRS24HArray.splice(i, 1);
                RebalanceTimestamps.splice(i, 1);
            } else {
                allAPRsumm = allAPRsumm.plus(APRS24HArray[i])
            }
        }  
        averageAPR24H = allAPRsumm.div(BigIntToBigDecimal(BigInt.fromI32(APRS24HArray.length)))

        lastEvent.lastFeeClaimTimestamp = event.block.timestamp
        lastEvent.APRS24H = APRS24HArray
        lastEvent.RebalanceTimestamps = RebalanceTimestamps
        lastEvent.save()
    } 
    
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

    const lastEvent = LastFeeAMLEntity.load(event.address)
    let APR = BigDecimal.fromString("0")
    let averageAPR24H = BigIntToBigDecimal(ZeroBigInt) 
    if(lastEvent){
        const timeDiff = BigIntToBigDecimal((event.block.timestamp.minus(lastEvent.lastFeeClaimTimestamp)).div(BigInt.fromI32(60)))
        const _feeUSD = BigIntToBigDecimal(feeUSD)
        const _totalUSD = BigIntToBigDecimal(totalUSD)
        const minutesInYear = BigIntToBigDecimal(BigInt.fromI32(525600))
        const hundred = BigIntToBigDecimal(BigInt.fromI32(100))
        APR = _feeUSD.div(_totalUSD).div(timeDiff).times(minutesInYear).times(hundred)


        let APRS24HArray = lastEvent.APRS24H
        let RebalanceTimestamps = lastEvent.RebalanceTimestamps
        APRS24HArray.push(APR)
        RebalanceTimestamps.push(event.block.timestamp)

        let allAPRsumm = BigIntToBigDecimal(ZeroBigInt)

        const threshold = event.block.timestamp.minus(BigInt.fromI32(86400)) //1 day
        
        for (let i = 0; i < APRS24HArray.length; i++) {
            if(threshold > RebalanceTimestamps[i]){
                APRS24HArray.splice(i, 1);
                RebalanceTimestamps.splice(i, 1);
            } else {
                allAPRsumm = allAPRsumm.plus(APRS24HArray[i])
            }
        }  
        averageAPR24H = allAPRsumm.div(BigIntToBigDecimal(BigInt.fromI32(APRS24HArray.length)))

        lastEvent.lastFeeClaimTimestamp = event.block.timestamp
        lastEvent.APRS24H = APRS24HArray
        lastEvent.RebalanceTimestamps = RebalanceTimestamps
        lastEvent.save()
    } 
    
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
