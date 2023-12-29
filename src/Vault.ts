import { Address } from "@graphprotocol/graph-ts"
import { VaultEntity, VaultHistoryEntity} from "../generated/schema"
import { addressZero, oneEther } from './constants'

import { 
    Transfer         as TransferEvent,
    DepositAssets    as DepositAssetsEvent,
    WithdrawAssets   as WithdrawAssetsEvent,
    VaultABI         as VaultContract        
} from "../generated/templates/VaultData/VaultABI"

export function handleDepositAssets(event: DepositAssetsEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    const vaultContract = VaultContract.bind(event.address); 
    const newTVL = vaultContract.tvl().value0
    vault.tvl = newTVL
    vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply)
    vault.save()

    let vaultHistoryEntity = new VaultHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    vaultHistoryEntity.address = event.address
    vaultHistoryEntity.sharePrice = vault.sharePrice
    vaultHistoryEntity.TVL = vault.tvl
    vaultHistoryEntity.timestamp = event.block.timestamp
    vaultHistoryEntity.save()
}

export function handleWithdrawAssets(event: WithdrawAssetsEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    const vaultContract = VaultContract.bind(event.address); 
    const newTVL = vaultContract.tvl().value0
    vault.tvl = newTVL
    vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply)
    vault.save()

    let vaultHistoryEntity = new VaultHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    vaultHistoryEntity.address = event.address
    vaultHistoryEntity.sharePrice = vault.sharePrice
    vaultHistoryEntity.TVL = vault.tvl
    vaultHistoryEntity.timestamp = event.block.timestamp
    vaultHistoryEntity.save()
}

export function handleTransfer(event: TransferEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    const totalSupply = vault.totalSupply

    if(event.params.from == Address.fromString(addressZero)){
        vault.totalSupply = totalSupply.plus(event.params.value)
    }

    if(event.params.to == Address.fromString(addressZero)){
        vault.totalSupply = totalSupply.minus(event.params.value)
    } 
    vault.save()
}