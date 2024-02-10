import { Address, Bytes, BigInt, ethereum, BigDecimal } from "@graphprotocol/graph-ts"
import { vaultManagerAddress, getBalanceAddress, ZeroBigInt } from './constants'
import {BigIntToBigDecimal} from "./math"
import { VaultManagerABI  as VaultManagerContract } from "../generated/templates/VaultManagerData/VaultManagerABI"
import { HardWork         as HardWorkEvent, 
         StrategyBaseABI  as StrategyContract} from "../generated/templates/StrategyData/StrategyBaseABI"
import { getBalanceABI as GetBalanceContract } from "../generated/templates/StrategyData/getBalanceABI"
import { VaultABI as VaultContract} from "../generated/templates/VaultData/VaultABI"       
import { VaultEntity, AssetHistoryEntity, VaultHistoryEntity, VaultAPRsEntity, UserVaultEntity, UserHistoryEntity, UserHistorySubEntity } from "../generated/schema"


export function handleHardWork(event: HardWorkEvent): void {
    const strategyContract      = StrategyContract.bind(event.address); 
    const vaultManagerContract  = VaultManagerContract.bind(Address.fromString(vaultManagerAddress)); 


    const vaultAddress      = strategyContract.vault();
    const vaultContract = VaultContract.bind(vaultAddress); 
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
    
    const vaultHistoryAPRsEntity = VaultAPRsEntity.load(vaultAddress) as VaultAPRsEntity
    let _APRArray = vaultHistoryAPRsEntity.APRS
    let _timestampsArray = vaultHistoryAPRsEntity.timestamps
    
    _APRArray.push(event.params.apr)
    _timestampsArray.push(event.block.timestamp)

    _APRArray = _APRArray.reverse()
    _timestampsArray= _timestampsArray.reverse()

    const day = BigInt.fromI32(86400)
    const DENOMINATOR = BigInt.fromI32(100000)
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
    let acc = ZeroBigInt
    
    for (let i = 0; i < weights.length; i++){
      APRS.push(_APRArray[i].times(weights[i]))
    } 

    for(let i = 0; i < APRS.length; i++){
      acc = acc.plus(APRS[i]) 
    }

    let averageAPR24H = ZeroBigInt
    if(APRS.length > 0){
      averageAPR24H = acc.div(BigInt.fromI32(APRS.length))
    }
    
    _APRArray = _APRArray.reverse()
    _timestampsArray= _timestampsArray.reverse()

    vaultHistoryAPRsEntity.APRS = _APRArray
    vaultHistoryAPRsEntity.timestamps = _timestampsArray
    vaultHistoryAPRsEntity.save()
    vaultHistoryEntity.APR24H = averageAPR24H
    vaultHistoryEntity.save()

    //===========Earn===========//
    const usersList = vault.vaultUsersList
    const totalSupply = vaultContract.totalSupply()
    const EARNED = event.params.earned
    for(let i = 0; i < usersList.length; i++){
      let userVault = UserVaultEntity.load(usersList[i]) as UserVaultEntity
      if(userVault.deposited == ZeroBigInt){
        continue
      } 
      const userAddress = Address.fromString(usersList[i].split(":")[1])
      const rewardByToken = EARNED.times(DENOMINATOR).div(totalSupply)
      const reward = vaultContract.balanceOf(userAddress).times(rewardByToken)
      userVault.rewardsEarned = userVault.rewardsEarned.plus(reward)
      userVault.save()

      let userHistory = new UserHistoryEntity(
        event.transaction.hash.concatI32(event.logIndex.toI32())
      )
      
      let userHistorySub = UserHistorySubEntity.load(userAddress) as UserHistorySubEntity
      userHistorySub.rewardsEarned = userHistorySub.rewardsEarned.plus(reward)
      userHistorySub.save()

      userHistory.userAddress = userAddress
      userHistory.rewardsEarned = userHistorySub.rewardsEarned
      userHistory.deposited = userHistorySub.deposited
      userHistory.timestamp = event.block.timestamp
      userHistory.save()
      
      let usersVault = vault.userVault
      if(usersVault){
        usersVault.push(usersList[i])
      } else {
        usersVault = []
        usersVault.push(usersList[i])
      }
      
      vault.userVault = usersVault
      vault.save() 
    }

}