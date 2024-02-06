import { Address, Bytes, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { vaultManagerAddress, getBalanceAddress, ZeroBigInt } from './constants'
import {BigIntToBigDecimal} from "./math"
import { VaultManagerABI  as VaultManagerContract } from "../generated/templates/VaultManagerData/VaultManagerABI"
import { HardWork         as HardWorkEvent, 
         StrategyBaseABI  as StrategyContract} from "../generated/templates/StrategyData/StrategyBaseABI"
import { getBalanceABI as GetBalanceContract } from "../generated/templates/StrategyData/getBalanceABI"       
import { VaultEntity, AssetHistoryEntity, VaultHistoryEntity, VaultAPR24HEntity } from "../generated/schema"


export function handleHardWork(event: HardWorkEvent): void {
    const strategyContract      = StrategyContract.bind(event.address); 
    const vaultManagerContract  = VaultManagerContract.bind(Address.fromString(vaultManagerAddress)); 
    

    const vaultAddress      = strategyContract.vault();
    const assestProportions = strategyContract.getAssetsProportions();

    const vault     = VaultEntity.load(vaultAddress) as VaultEntity; 
    const vaultInfo = vaultManagerContract.vaultInfo(vaultAddress)
    
    vault.apr = event.params.apr
    vault.tvl = event.params.tvl
    vault.sharePrice = event.params.sharePrice
    vault.assetsProportions = assestProportions
    vault.lastHardWork = event.block.timestamp
    vault.assetsWithApr =  changetype<Bytes[]>(vaultInfo.value3)
    vault.assetsAprs = (vaultInfo.value4)
    if(event.block.number > BigInt.fromI32(53088320)){
      const getBalanceContract    = GetBalanceContract.bind(Address.fromString(getBalanceAddress))
      vault.gasReserve = getBalanceContract.getBalance(vaultAddress)
    } 
    vault.save()
  
    for (let i = 0; i < vault.strategyAssets.length; i++) {
      let assetHistory = new AssetHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
      )
      assetHistory.address = vault.strategyAssets[i]
      assetHistory.price  = event.params.assetPrices[i]
      assetHistory.timestamp = event.block.timestamp
      assetHistory.save()
    } 
    
    let vaultHistoryEntity = new VaultHistoryEntity(
      event.transaction.hash.concatI32(event.transaction.nonce.toI32())
    )
    vaultHistoryEntity.address = vaultAddress
    vaultHistoryEntity.sharePrice = event.params.sharePrice
    vaultHistoryEntity.TVL = event.params.tvl 
    vaultHistoryEntity.timestamp = event.block.timestamp
    vaultHistoryEntity.APR = event.params.apr
    vaultHistoryEntity.APR_Compound = event.params.compoundApr
    

    const vaultHistoryAPR24HEntity = VaultAPR24HEntity.load(vaultAddress) as VaultAPR24HEntity
    let _APRArray = vaultHistoryAPR24HEntity.APRS24H
    let _timestampsArray = vaultHistoryAPR24HEntity.timestamps

    _APRArray.push(BigIntToBigDecimal(event.params.apr).div(BigIntToBigDecimal(BigInt.fromI32(100000))))
    _timestampsArray.push(event.block.timestamp)

    const threshold = event.block.timestamp.minus(BigInt.fromI32(86400)) //1 day

    let allAPRsumm = BigIntToBigDecimal(ZeroBigInt)

    for (let i = 0; i < _APRArray.length; i++) {
      if(threshold > _timestampsArray[i]){
          _APRArray.splice(i, 1);
          _timestampsArray.splice(i, 1);
      } else {
          allAPRsumm = allAPRsumm.plus(_APRArray[i])
      }
    } 
    
    let averageAPR24H = allAPRsumm.div(BigIntToBigDecimal(BigInt.fromI32(_APRArray.length)))

    vaultHistoryAPR24HEntity.APRS24H = _APRArray
    vaultHistoryAPR24HEntity.timestamps = _timestampsArray
    vaultHistoryAPR24HEntity.save()
    vaultHistoryEntity.APR24H = averageAPR24H
    vaultHistoryEntity.save()
}