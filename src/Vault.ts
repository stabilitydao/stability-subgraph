import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { VaultEntity, VaultHistoryEntity, UserHistoryEntity, VaultUserEntity} from "../generated/schema"
import { ZeroBigInt, addressZero, oneEther, priceReaderAddress } from './constants'

import { 
    Transfer                   as TransferEvent,
    DepositAssets              as DepositAssetsEvent,
    WithdrawAssets             as WithdrawAssetsEvent,
    VaultName                  as VaultNameEvent,
    VaultSymbol                as VaultSymbolEvent,
    DoHardWorkOnDepositChanged as DoHardWorkOnDepositChangedEvent,
    VaultABI                   as VaultContract        
} from "../generated/templates/VaultData/VaultABI"
import {PriceReaderABI as PriceReaderContract} from "../generated/templates/IchiQuickSwapMerklFarmData/PriceReaderABI"
import {WithdrawAssets as WithdrawAssetsEventOld} from "../generated/templates/deprecatedData/deprecatedABI"

export function handleDepositAssets(event: DepositAssetsEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    const vaultContract = VaultContract.bind(event.address); 
    const priceReader = PriceReaderContract.bind(Address.fromString(priceReaderAddress));

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
    
    //const _VaultUserId = event.address.concat(event.params.account)
    const _VaultUserId = event.address.toString() + event.address.toString()
    let user = VaultUserEntity.load(_VaultUserId)
    if (!user) {
        user = new VaultUserEntity(_VaultUserId)
        user.deposited = ZeroBigInt
        user.rewardsEarned = ZeroBigInt
     
        let _length = event.params.assets.length
        let assetsArray: Array<Address> = []
        let amountsArray: Array<BigInt> = [] 
        for (let i = 0; i < _length; i++) {
            assetsArray.push(event.params.assets[i])
            amountsArray.push(event.params.amounts[i])
        }

        const assetsPrices = priceReader.getAssetsPrice(
            assetsArray, 
            amountsArray
        )
        
        let depositedUSDT: BigInt = ZeroBigInt 
        for (let i = 0; i < _length; i++) {
            if(i + 1 < _length){
                depositedUSDT = assetsPrices.value1[i].plus(assetsPrices.value1[i++])
            }
        } 
        user.deposited = user.deposited.plus(depositedUSDT)
        user.save()
    }

 /*    //const _newUserInfo = [_VaultUserId, user.deposited, user.rewardsEarned]
    const _newUserInfo = _VaultUserId
    let _UsersEntitiesArray = vault.VaultUsers
    if(_UsersEntitiesArray){
        const index = _UsersEntitiesArray.indexOf(_VaultUserId)
        if(index > -1){
            _UsersEntitiesArray.splice(index, 1);
        }   
        if(!_UsersEntitiesArray.includes(_VaultUserId)){
            _UsersEntitiesArray.push(_newUserInfo)
        }
    }
 */
    //vault.VaultUsers = _UsersEntitiesArray
    vault.save() 
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

