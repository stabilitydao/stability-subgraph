import { Address, BigInt, Bytes, BigDecimal } from "@graphprotocol/graph-ts";

import {
  VaultEntity,
  VaultHistoryEntity,
  UserHistoryEntity,
  UserVaultEntity,
  UserAllDataEntity,
  UserEntity,
} from "../generated/schema";

import {
  Transfer as TransferEvent,
  DepositAssets as DepositAssetsEvent,
  WithdrawAssets as WithdrawAssetsEvent,
  VaultName as VaultNameEvent,
  VaultSymbol as VaultSymbolEvent,
  DoHardWorkOnDepositChanged as DoHardWorkOnDepositChangedEvent,
  VaultABI as VaultContract,
} from "../generated/templates/VaultData/VaultABI";
import { PriceReaderABI as PriceReaderContract } from "../generated/templates/IchiQuickSwapMerklFarmData/PriceReaderABI";
import { WithdrawAssets as WithdrawAssetsEventOld } from "../generated/templates/deprecatedData/deprecatedABI";
import { StrategyBaseABI as StrategyContract } from "../generated/templates/StrategyData/StrategyBaseABI";
import { VaultManagerABI as VaultManagerContract } from "../generated/templates/VaultManagerData/VaultManagerABI";
import { ILeverageLendingStrategyABI as LeverageLendingContract } from "../generated/templates/LeverageLendingStrategyData/ILeverageLendingStrategyABI";

import {
  ZeroBigInt,
  addressZero,
  oneEther,
  vaultManagerAddress,
  priceReaderAddress,
  OneBigInt,
} from "./utils/constants";

export function handleDepositAssets(event: DepositAssetsEvent): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  const vaultContract = VaultContract.bind(event.address);

  if (!vault.isInitialized) {
    const vaultManagerContract = VaultManagerContract.bind(
      Address.fromString(vaultManagerAddress)
    );

    const _vaultInfo = vaultManagerContract.vaultInfo(event.address);

    const _amounts: Array<BigInt> = [];
    for (let i = 0; i < _vaultInfo.value1.length; i++) {
      _amounts.push(ZeroBigInt);
    }

    const priceReader = PriceReaderContract.bind(
      Address.fromString(priceReaderAddress)
    );

    const assetsPrices = priceReader.getAssetsPrice(
      _vaultInfo.value1,
      _amounts
    );

    vault.AssetsPricesOnCreation = assetsPrices.value2;
    vault.isInitialized = true;
  }

  const _VaultUserId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.account.toHexString());

  const strategyContract = StrategyContract.bind(
    changetype<Address>(vault.strategy)
  );

  const assetsAmounts = strategyContract.assetsAmounts();

  //===========Put new data to vaultEntity===========//
  const newTVL = vaultContract.tvl().value0;
  vault.tvl = newTVL;

  let _sharePrice = newTVL.times(oneEther).div(vault.totalSupply);

  if (vault.isLendingLeverageStrategy) {
    const leverageStrategyContract = LeverageLendingContract.bind(
      changetype<Address>(vault.strategy)
    );

    _sharePrice = leverageStrategyContract.realSharePrice().value0;
  }

  vault.sharePrice = _sharePrice;

  if (!vault.initAssetsAmounts) {
    vault.initAssetsAmounts = assetsAmounts.value1;
  }

  vault.save();

  //===========Create VaultHistoryEntity (immutable)===========//
  let vaultHistoryEntity = new VaultHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(event.address.toHexString())
  );
  // ============================================ //
  vaultHistoryEntity.address = event.address;
  vaultHistoryEntity.vault = event.address;
  vaultHistoryEntity.sharePrice = vault.sharePrice;
  vaultHistoryEntity.TVL = vault.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.save();
  //===========UserVaultEntity + UserEntity===========//

  let userVault = UserVaultEntity.load(_VaultUserId);

  let usersCount = vault.users;
  const vaultAddress = event.address.toHexString();
  const account = changetype<Bytes>(event.params.account);

  if (!userVault) {
    let currentUsersCount = usersCount.plus(OneBigInt);

    vault.users = currentUsersCount;
    vault.save();

    const userID = vaultAddress
      .concat(":")
      .concat(currentUsersCount.toHexString());

    let userEntity = new UserEntity(userID);
    userEntity.address = account;

    userEntity.save();

    userVault = new UserVaultEntity(_VaultUserId);
    userVault.balance = ZeroBigInt;
    userVault.deposited = ZeroBigInt;
    userVault.rewardsEarned = ZeroBigInt;
  }

  const userBalance = vaultContract.balanceOf(event.params.account);

  userVault.balance = userBalance;

  userVault.deposited = userBalance.times(vault.sharePrice);

  userVault.save();
  //===========UserHistoryEntity && userAllDataEntity===========//

  let userHistory = new UserHistoryEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  let userAllDataEntity = UserAllDataEntity.load(event.params.account);

  if (!userAllDataEntity) {
    const userVaults = [changetype<Bytes>(event.address)];

    userAllDataEntity = new UserAllDataEntity(event.params.account);
    userAllDataEntity.rewardsEarned = ZeroBigInt;
    userAllDataEntity.vaults = userVaults;
    userAllDataEntity.deposited = ZeroBigInt;
  }

  if (!userAllDataEntity.vaults.includes(event.address)) {
    const userVaults = userAllDataEntity.vaults;
    userVaults.push(changetype<Bytes>(event.address));
    userAllDataEntity.vaults = userVaults;
  }

  let summ: BigInt = ZeroBigInt;
  for (let i = 0; i < userAllDataEntity.vaults.length; i++) {
    const _VaultUserId = userAllDataEntity.vaults[i]
      .toHexString()
      .concat(":")
      .concat(event.params.account.toHexString());
    let userVault = UserVaultEntity.load(_VaultUserId);

    if (!userVault) {
      userVault = new UserVaultEntity(_VaultUserId);
      userVault.balance = ZeroBigInt;
      userVault.deposited = ZeroBigInt;
      userVault.rewardsEarned = ZeroBigInt;
    } else {
      summ = summ.plus(userVault.deposited);
    }
  }

  userAllDataEntity.deposited = summ;
  userAllDataEntity.save();

  userHistory.userAddress = event.params.account;
  userHistory.deposited = summ;
  userHistory.timestamp = event.block.timestamp;
  userHistory.save();
}

export function handleWithdrawAssetsOld(event: WithdrawAssetsEventOld): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  const vaultContract = VaultContract.bind(event.address);

  //===========Put new data to vaultEntity===========//

  const newTVL = vaultContract.tvl().value0;
  vault.tvl = newTVL;

  let _sharePrice = newTVL.times(oneEther).div(vault.totalSupply);

  if (vault.isLendingLeverageStrategy) {
    const leverageStrategyContract = LeverageLendingContract.bind(
      changetype<Address>(vault.strategy)
    );

    _sharePrice = leverageStrategyContract.realSharePrice().value0;
  }

  vault.sharePrice = _sharePrice;

  vault.save();

  //===========Create VaultHistoryEntity (immutable)===========//
  let vaultHistoryEntity = new VaultHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(event.address.toHexString())
  );
  vaultHistoryEntity.address = event.address;
  vaultHistoryEntity.vault = event.address;
  vaultHistoryEntity.sharePrice = vault.sharePrice;
  vaultHistoryEntity.TVL = vault.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.save();
  //===========UserVaultEntity===========//
  const _VaultUserId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.account.toHexString());
  let userVault = UserVaultEntity.load(_VaultUserId) as UserVaultEntity;
  let userAllDataEntity = UserAllDataEntity.load(
    event.params.account
  ) as UserAllDataEntity;

  const userBalance = vaultContract.balanceOf(event.params.account);

  userVault.balance = userBalance;

  userVault.deposited = userBalance.times(vault.sharePrice);

  userVault.save();

  //===========UserHistoryEntity && userAllDataEntity===========//
  let userHistory = new UserHistoryEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  let summ: BigInt = ZeroBigInt;
  for (let i = 0; i < userAllDataEntity.vaults.length; i++) {
    const _VaultUserId = userAllDataEntity.vaults[i]
      .toHexString()
      .concat(":")
      .concat(event.params.account.toHexString());
    const userVault = UserVaultEntity.load(_VaultUserId) as UserVaultEntity;
    summ = summ.plus(userVault.deposited);
  }

  userAllDataEntity.deposited = summ;
  userAllDataEntity.save();

  userHistory.userAddress = event.params.account;
  userHistory.deposited = summ;
  userHistory.timestamp = event.block.timestamp;
  userHistory.save();
}

export function handleWithdrawAssets(event: WithdrawAssetsEvent): void {
  const vault = VaultEntity.load(event.address);
  if (!vault) {
    return;
  }

  const vaultContract = VaultContract.bind(event.address);
  const userAllDataEntity = UserAllDataEntity.load(event.params.owner);
  if (!userAllDataEntity) {
    return;
  }

  //===========Put new data to vaultEntity===========//
  const newTVL = vaultContract.tvl().value0;
  vault.tvl = newTVL;

  let _sharePrice = newTVL.times(oneEther).div(vault.totalSupply);

  if (vault.isLendingLeverageStrategy) {
    const leverageStrategyContract = LeverageLendingContract.bind(
      changetype<Address>(vault.strategy)
    );

    _sharePrice = leverageStrategyContract.realSharePrice().value0;
  }

  vault.sharePrice = _sharePrice;
  vault.save();

  //===========Create VaultHistoryEntity (immutable)===========//
  let vaultHistoryEntity = new VaultHistoryEntity(
    event.transaction.hash
      .concatI32(event.transaction.nonce.toI32())
      .toHexString()
      .concat(":")
      .concat(event.address.toHexString())
  );
  vaultHistoryEntity.address = event.address;
  vaultHistoryEntity.vault = event.address;
  vaultHistoryEntity.sharePrice = vault.sharePrice;
  vaultHistoryEntity.TVL = vault.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.save();
  //===========UserVaultEntity===========//
  const _VaultUserId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.owner.toHexString());
  let userVault = UserVaultEntity.load(_VaultUserId);
  if (!userVault) {
    return;
  }

  const userBalance = vaultContract.balanceOf(event.params.owner);

  userVault.balance = userBalance;

  userVault.deposited = userBalance.times(vault.sharePrice);
  userVault.save();

  //===========UserHistoryEntity && userAllDataEntity===========//
  let userHistory = new UserHistoryEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  let summ: BigInt = ZeroBigInt;
  for (let i = 0; i < userAllDataEntity.vaults.length; i++) {
    const _VaultUserId = userAllDataEntity.vaults[i]
      .toHexString()
      .concat(":")
      .concat(event.params.owner.toHexString());
    const userVault = UserVaultEntity.load(_VaultUserId);
    if (userVault) {
      summ = summ.plus(userVault.deposited);
    }
  }

  userAllDataEntity.deposited = summ;
  userAllDataEntity.save();

  userHistory.userAddress = event.params.owner;
  userHistory.deposited = summ;
  userHistory.timestamp = event.block.timestamp;
  userHistory.save();
}

export function handleTransfer(event: TransferEvent): void {
  let vault = VaultEntity.load(event.address);

  if (!vault) {
    return;
  }

  const totalSupply = vault.totalSupply;

  if (event.params.from == Address.fromString(addressZero)) {
    vault.totalSupply = totalSupply.plus(event.params.value);
  } else if (event.params.to == Address.fromString(addressZero)) {
    vault.totalSupply = totalSupply.minus(event.params.value);
  } else {
    const vaultContract = VaultContract.bind(event.address);

    if (!vaultContract) {
      return;
    }

    const _VaultToUserId = event.address
      .toHexString()
      .concat(":")
      .concat(event.params.to.toHexString());

    const _VaultFromUserId = event.address
      .toHexString()
      .concat(":")
      .concat(event.params.from.toHexString());

    let fromUserVault = UserVaultEntity.load(_VaultFromUserId);
    let toUserVault = UserVaultEntity.load(_VaultToUserId);

    if (!fromUserVault) {
      fromUserVault = new UserVaultEntity(_VaultFromUserId);
      fromUserVault.balance = ZeroBigInt;
      fromUserVault.rewardsEarned = ZeroBigInt;
      fromUserVault.deposited = ZeroBigInt;
    } else {
      const fromUserBalance = vaultContract.balanceOf(event.params.from);

      fromUserVault.balance = fromUserBalance;

      fromUserVault.deposited = fromUserBalance.times(vault.sharePrice);
    }

    if (!toUserVault) {
      toUserVault = new UserVaultEntity(_VaultToUserId);
      toUserVault.balance = event.params.value;
      toUserVault.rewardsEarned = ZeroBigInt;
      toUserVault.deposited = event.params.value.times(vault.sharePrice);
    } else {
      const toUserBalance = vaultContract.balanceOf(event.params.to);

      toUserVault.balance = toUserBalance;

      toUserVault.deposited = toUserBalance.times(vault.sharePrice);
    }

    toUserVault.save();
    fromUserVault.save();
  }

  vault.save();
}

export function handleVaultName(event: VaultNameEvent): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  vault.name = event.params.newName;
  vault.save();
}

export function handleVaultSymbol(event: VaultSymbolEvent): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  vault.symbol = event.params.newSymbol;
  vault.save();
}

export function handleDoHardWorkOnDepositChanged(
  event: DoHardWorkOnDepositChangedEvent
): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  vault.hardWorkOnDeposit = event.params.newValue;
  vault.save();
}
