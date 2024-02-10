import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { VaultEntity, VaultHistoryEntity, UserHistoryEntity, UserVaultEntity, UserHistorySubEntity} from "../generated/schema"
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
    const _VaultUserId = event.address.toHexString().concat(":").concat(event.params.account.toHexString()) 

    //===========Put new data to vaultEntity===========//
    const newTVL = vaultContract.tvl().value0
    vault.tvl = newTVL
    vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply)
    if(!vault.vaultUsersList.includes(_VaultUserId)){
        const usersList = vault.vaultUsersList
        usersList.push(_VaultUserId)
        vault.vaultUsersList = usersList
    }
    vault.save()

    //===========Create VaultHistoryEntity (immutable)===========//
    let vaultHistoryEntity = new VaultHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    vaultHistoryEntity.address = event.address
    vaultHistoryEntity.sharePrice = vault.sharePrice
    vaultHistoryEntity.TVL = vault.tvl
    vaultHistoryEntity.timestamp = event.block.timestamp
    vaultHistoryEntity.save()
    
    //===========UserVaultEntity===========//
    
    let userVault = UserVaultEntity.load(_VaultUserId)
    
    if (!userVault) {
        userVault = new UserVaultEntity(_VaultUserId)
        userVault.deposited = ZeroBigInt
        userVault.rewardsEarned = ZeroBigInt
        userVault.save()
    }

    const assetsArray: Array<Address> = []
    const amountsArray: Array<BigInt> = [] 

    let depositedUSDT = ZeroBigInt;
    if(event.params.assets.length == event.params.amounts.length){
        for (let i = 0; i < event.params.assets.length; i++) {
            assetsArray.push(event.params.assets[i])
            amountsArray.push(event.params.amounts[i])
        }
    
        const assetsPrices = priceReader.getAssetsPrice(
            assetsArray, 
            amountsArray
        )
        
        depositedUSDT = assetsPrices.value0
    } else {
        depositedUSDT = vaultContract.balanceOf(event.params.account).times(vault.sharePrice)
    }

    userVault.deposited = userVault.deposited.plus(depositedUSDT)
    userVault.save()

    //===========UserHistoryEntity && UserHistorySubEntity===========//

    let userHistory = new UserHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
      )

    let userHistorySub = UserHistorySubEntity.load(event.params.account)

    if(!userHistorySub){
        userHistorySub = new UserHistorySubEntity(event.params.account)
        userHistorySub.deposited = ZeroBigInt
        userHistorySub.rewardsEarned = ZeroBigInt
        userHistorySub.save()
    }

    userHistorySub.deposited = userHistorySub.deposited.plus(depositedUSDT)
    userHistorySub.save()
    userHistory.userAddress = event.params.account
    userHistory.deposited = userHistorySub.deposited
    userHistory.timestamp = event.block.timestamp
    userHistory.save()
}

export function handleWithdrawAssetsOld(event: WithdrawAssetsEventOld): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    const vaultContract = VaultContract.bind(event.address); 
    const priceReader = PriceReaderContract.bind(Address.fromString(priceReaderAddress));

    //===========Put new data to vaultEntity===========//
    const newTVL = vaultContract.tvl().value0
    vault.tvl = newTVL
    vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply)
    vault.save()

    //===========Create VaultHistoryEntity (immutable)===========//
    let vaultHistoryEntity = new VaultHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    vaultHistoryEntity.address = event.address
    vaultHistoryEntity.sharePrice = vault.sharePrice
    vaultHistoryEntity.TVL = vault.tvl
    vaultHistoryEntity.timestamp = event.block.timestamp
    vaultHistoryEntity.save()

    //===========UserVaultEntity===========//
    const _VaultUserId = event.address.toHexString().concat(":").concat(event.params.account.toHexString()) 
    let userVault = UserVaultEntity.load(_VaultUserId) as UserVaultEntity
    let userHistorySub = UserHistorySubEntity.load(event.params.account) as UserHistorySubEntity

    const _length = event.params.assets.length
    const assetsArray: Array<Address> = []
    const amountsArray: Array<BigInt> = [] 
    for (let i = 0; i < _length; i++) {
        assetsArray.push(event.params.assets[i])
        amountsArray.push(event.params.amountsOut[i])
    }

    const assetsPrices = priceReader.getAssetsPrice(
        assetsArray, 
        amountsArray
    )

    let withdrawUSDT = assetsPrices.value0

    userVault.deposited = userVault.deposited.minus(withdrawUSDT)
    userVault.save()

    //===========UserHistoryEntity && UserHistorySubEntity===========//
    let userHistory = new UserHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
      )


    userHistorySub.deposited = userHistorySub.deposited.minus(withdrawUSDT)
    userHistorySub.save()
    userHistory.userAddress = event.params.account
    userHistory.deposited = userHistorySub.deposited
    userHistory.timestamp = event.block.timestamp
    userHistory.save()
}

export function handleWithdrawAssets(event: WithdrawAssetsEvent): void {
    const vault = VaultEntity.load(event.address) as VaultEntity;
    const vaultContract = VaultContract.bind(event.address); 
    const priceReader = PriceReaderContract.bind(Address.fromString(priceReaderAddress));

    //===========Put new data to vaultEntity===========//
    const newTVL = vaultContract.tvl().value0
    vault.tvl = newTVL
    vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply)
    vault.save()

    //===========Create VaultHistoryEntity (immutable)===========//
    let vaultHistoryEntity = new VaultHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    vaultHistoryEntity.address = event.address
    vaultHistoryEntity.sharePrice = vault.sharePrice
    vaultHistoryEntity.TVL = vault.tvl
    vaultHistoryEntity.timestamp = event.block.timestamp
    vaultHistoryEntity.save()

    //===========UserVaultEntity===========//
    const _VaultUserId = event.address.toHexString().concat(":").concat(event.params.owner.toHexString()) 
    let userVault = UserVaultEntity.load(_VaultUserId) as UserVaultEntity
    
    const _length = event.params.assets.length
    const assetsArray: Array<Address> = []
    const amountsArray: Array<BigInt> = [] 
    for (let i = 0; i < _length; i++) {
        assetsArray.push(event.params.assets[i])
        amountsArray.push(event.params.amountsOut[i])
    }

    const assetsPrices = priceReader.getAssetsPrice(
        assetsArray, 
        amountsArray
    )
    
    let withdrawUSDT = assetsPrices.value0

    userVault.deposited = userVault.deposited.minus(withdrawUSDT)
    userVault.save()

    //===========UserHistoryEntity && UserHistorySubEntity===========//
    let userHistory = new UserHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
      )
      
    let userHistorySub = UserHistorySubEntity.load(event.params.owner) as UserHistorySubEntity
    userHistorySub.deposited = userHistorySub.deposited.minus(withdrawUSDT)
    userHistorySub.save()

    userHistory.userAddress = event.params.owner
    userHistory.deposited = userHistorySub.deposited
    userHistory.timestamp = event.block.timestamp
    userHistory.save()
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

