import { Address } from "@graphprotocol/graph-ts"
import { VaultEntity, VaultHistoryEntity, UserHistoryEntity} from "../generated/schema"
import { addressZero, oneEther } from './constants'

import { 
    Transfer                   as TransferEvent,
    DepositAssets              as DepositAssetsEvent,
    WithdrawAssets             as WithdrawAssetsEvent,
    VaultName                  as VaultNameEvent,
    VaultSymbol                as VaultSymbolEvent,
    DoHardWorkOnDepositChanged as DoHardWorkOnDepositChangedEvent,
    VaultABI                   as VaultContract        
} from "../generated/templates/VaultData/VaultABI"

import {WithdrawAssets as WithdrawAssetsEventOld} from "../generated/templates/deprecatedData/deprecatedABI"

export function handleDepositAssets(event: DepositAssetsEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    const user = UserHistoryEntity.load(event.params.account) as UserHistoryEntity;
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
    

    //user.Deposited += event.params.

}

export function handleWithdrawAssetsOld(event: WithdrawAssetsEventOld): void {
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

export function handleVaultName(event: VaultNameEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    vault.name = event.params.newName
    vault.save()
}

export function handleVaultSymbol(event: VaultSymbolEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    vault.symbol = event.params.newSymbol
    vault.save()
}

export function handleDoHardWorkOnDepositChanged(event: DoHardWorkOnDepositChangedEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    vault.hardWorkOnDeposit = event.params.newValue
    vault.save()
}
