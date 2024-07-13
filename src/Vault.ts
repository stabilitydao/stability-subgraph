import { Address, BigInt, Bytes, BigDecimal } from "@graphprotocol/graph-ts";
import {
  VaultEntity,
  VaultHistoryEntity,
  UserHistoryEntity,
  UserVaultEntity,
  UserAllDataEntity,
} from "../generated/schema";
import {
  ZeroBigInt,
  addressZero,
  oneEther,
  platformAddress,
} from "./constants";

import {
  Transfer as TransferEvent,
  DepositAssets as DepositAssetsEvent,
  WithdrawAssets as WithdrawAssetsEvent,
  VaultName as VaultNameEvent,
  VaultSymbol as VaultSymbolEvent,
  DoHardWorkOnDepositChanged as DoHardWorkOnDepositChangedEvent,
  VaultABI as VaultContract,
} from "../generated/templates/VaultData/VaultABI";
import { DefiEdgeStrategyABI } from "../generated/templates/FactoryData/DefiEdgeStrategyABI";
import { PriceReaderABI as PriceReaderContract } from "../generated/templates/IchiQuickSwapMerklFarmData/PriceReaderABI";
import { WithdrawAssets as WithdrawAssetsEventOld } from "../generated/templates/deprecatedData/deprecatedABI";
import { StrategyBaseABI as StrategyContract } from "../generated/templates/StrategyData/StrategyBaseABI";

export function handleDepositAssets(event: DepositAssetsEvent): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  const vaultContract = VaultContract.bind(event.address);

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
  vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply);
  if (!vault.vaultUsersList.includes(_VaultUserId)) {
    const usersList = vault.vaultUsersList;
    usersList.push(_VaultUserId);
    vault.vaultUsersList = usersList;
  }

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
  vaultHistoryEntity.sharePrice = vault.sharePrice;
  vaultHistoryEntity.TVL = vault.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.save();

  //===========vaultHistoryEntity(VaultEntity)===========//
  let _vaultHistoryEntity = vault.vaultHistoryEntity;
  if (_vaultHistoryEntity) {
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  } else {
    _vaultHistoryEntity = [];
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  }

  vault.vaultHistoryEntity = _vaultHistoryEntity;
  vault.save();
  //===========UserVaultEntity===========//

  let userVault = UserVaultEntity.load(_VaultUserId);

  if (!userVault) {
    userVault = new UserVaultEntity(_VaultUserId);
    userVault.rewardsEarned = ZeroBigInt;
  }

  userVault.deposited = vaultContract
    .balanceOf(event.params.account)
    .times(vault.sharePrice);
  userVault.save();

  //===========UserHistoryEntity && userAllDataEntity===========//

  let userHistory = new UserHistoryEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  let userAllDataEntity = UserAllDataEntity.load(event.params.account);

  if (!userAllDataEntity) {
    userAllDataEntity = new UserAllDataEntity(event.params.account);
    userAllDataEntity.deposited = ZeroBigInt;
    userAllDataEntity.rewardsEarned = ZeroBigInt;
    const userVaults = [changetype<Bytes>(event.address)];
    userAllDataEntity.vaults = userVaults;
    userAllDataEntity.save();
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

export function handleWithdrawAssetsOld(event: WithdrawAssetsEventOld): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  const vaultContract = VaultContract.bind(event.address);

  //===========Put new data to vaultEntity===========//

  const newTVL = vaultContract.tvl().value0;
  vault.tvl = newTVL;
  vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply);

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
  vaultHistoryEntity.sharePrice = vault.sharePrice;
  vaultHistoryEntity.TVL = vault.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.save();

  //===========vaultHistoryEntity(VaultEntity)===========//
  let _vaultHistoryEntity = vault.vaultHistoryEntity;
  if (_vaultHistoryEntity) {
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  } else {
    _vaultHistoryEntity = [];
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  }

  vault.vaultHistoryEntity = _vaultHistoryEntity;
  vault.save();
  //===========UserVaultEntity===========//
  const _VaultUserId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.account.toHexString());
  let userVault = UserVaultEntity.load(_VaultUserId) as UserVaultEntity;
  let userAllDataEntity = UserAllDataEntity.load(
    event.params.account
  ) as UserAllDataEntity;

  userVault.deposited = vaultContract
    .balanceOf(event.params.account)
    .times(vault.sharePrice);
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
  vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply);
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
  vaultHistoryEntity.sharePrice = vault.sharePrice;
  vaultHistoryEntity.TVL = vault.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.save();

  //===========vaultHistoryEntity(VaultEntity)===========//
  let _vaultHistoryEntity = vault.vaultHistoryEntity;
  if (_vaultHistoryEntity) {
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  } else {
    _vaultHistoryEntity = [];
    _vaultHistoryEntity.push(vaultHistoryEntity.id);
  }

  vault.vaultHistoryEntity = _vaultHistoryEntity;
  vault.save();

  //===========UserVaultEntity===========//
  const _VaultUserId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.owner.toHexString());
  let userVault = UserVaultEntity.load(_VaultUserId);
  if (!userVault) {
    return;
  }

  userVault.deposited = vaultContract
    .balanceOf(event.params.owner)
    .times(vault.sharePrice);
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
  const vault = VaultEntity.load(event.address) as VaultEntity;
  const totalSupply = vault.totalSupply;

  if (event.params.from == Address.fromString(addressZero)) {
    vault.totalSupply = totalSupply.plus(event.params.value);
  }

  if (event.params.to == Address.fromString(addressZero)) {
    vault.totalSupply = totalSupply.minus(event.params.value);
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
