import { Address, Bytes } from "@graphprotocol/graph-ts"
import { vaultManagerAddress } from './constants'
import { VaultManagerABI  as VaultManagerContract } from "../generated/templates/VaultManagerData/VaultManagerABI"
import { HardWork         as HardWorkEvent        } from "../generated/templates/StrategyData/StrategyBaseABI"
import { StrategyBaseABI  as StrategyContract     } from "../generated/templates/StrategyData/StrategyBaseABI"
import { VaultEntity, AssetHistoryEntity } from "../generated/schema"


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
}