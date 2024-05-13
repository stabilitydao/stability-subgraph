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
  ZeroBigDecimal,
  OneHundredBigDecimal,
  YearBigDecimal,
  EtherBigDecimal,
  OneBigDecimal,
} from "./constants";

import { pow } from "./math";

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
import { ERC20UpgradeableABI } from "../generated/templates/FactoryData/ERC20UpgradeableABI";
import { PlatformABI as PlatformContract } from "../generated/PlatformData/PlatformABI";

export function handleDepositAssets(event: DepositAssetsEvent): void {
  const vault = VaultEntity.load(event.address) as VaultEntity;
  const vaultContract = VaultContract.bind(event.address);

  const _VaultUserId = event.address
    .toHexString()
    .concat(":")
    .concat(event.params.account.toHexString());

  //===========Put new data to vaultEntity===========//
  const newTVL = vaultContract.tvl().value0;
  vault.tvl = newTVL;
  vault.sharePrice = newTVL.times(oneEther).div(vault.totalSupply);
  if (!vault.vaultUsersList.includes(_VaultUserId)) {
    const usersList = vault.vaultUsersList;
    usersList.push(_VaultUserId);
    vault.vaultUsersList = usersList;
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
  //===========Get platform data===========//

  const platformContract = PlatformContract.bind(
    Address.fromString(platformAddress)
  );
  const getPlatformBalance = platformContract.getBalance(event.params.account);

  const tokensAddress = getPlatformBalance.value0;

  const formatedTokensAddress: Bytes[] = [];

  for (let i = 0; i < tokensAddress.length; i++) {
    formatedTokensAddress.push(changetype<Bytes>(tokensAddress[i]));
  }

  const prices = getPlatformBalance.value1;

  const assetsPrice = new Map<string, BigInt>();

  for (let i = 0; i < tokensAddress.length; i++) {
    assetsPrice.set(tokensAddress[i].toString(), prices[i]);
  }

  //===========Get assets amounts from strategy contract===========//
  const strategyContract = StrategyContract.bind(
    changetype<Address>(vault.strategy)
  );
  const assetsAmounts = strategyContract.assetsAmounts();
  const strategyAssets = assetsAmounts.value0;
  const strategyAssetsAmounts = assetsAmounts.value1;

  //====================== Calculate VS HOLD ======================//

  let holdYearPercentDiff: BigDecimal = ZeroBigDecimal;
  let holdPercentDiff: BigDecimal = ZeroBigDecimal;
  let sum: BigDecimal = ZeroBigDecimal;
  let sharePriceDifference: BigDecimal = ZeroBigDecimal;
  let daysFromCreation: String = "";

  const holdTokenPresentProportion: String[] = [];
  const holdTokenAPR: String[] = [];
  const amounts: String[] = [];
  const amountsInUSD: String[] = [];
  const proportions: String[] = [];

  const sharePriceOnCreation: BigDecimal = OneBigDecimal;

  const sharePrice: BigDecimal = BigDecimal.fromString(
    vault.sharePrice.toString()
  ).div(EtherBigDecimal);

  if (
    strategyAssets.length &&
    strategyAssetsAmounts.length &&
    assetsPrice &&
    vault.AssetsPricesOnCreation.length
  ) {
    const tokensDecimals: BigInt[] = strategyAssets.map<BigInt>(
      (asset: Address) => {
        const tokenContract = ERC20UpgradeableABI.bind(asset);
        const decimals = tokenContract.decimals();
        return BigInt.fromI32(decimals);
      }
    );

    for (let i = 0; i < strategyAssetsAmounts.length; i++) {
      let amount: BigDecimal = BigDecimal.fromString(
        strategyAssetsAmounts[i].toString()
      ).div(
        pow(
          BigDecimal.fromString("10"),
          BigInt.fromI32(tokensDecimals[i].toI32())
        )
      );
      amounts.push(amount.toString());
    }

    for (let i = 0; i < amounts.length; i++) {
      let address = strategyAssets[i];

      const price = assetsPrice.get(address.toString()).toString();

      let amountInUSD: BigDecimal = BigDecimal.fromString(price)
        .div(EtherBigDecimal)
        .times(BigDecimal.fromString(amounts[i]));

      amountsInUSD.push(amountInUSD.toString());
    }

    for (let i = 0; i < amountsInUSD.length; i++) {
      sum = sum.plus(BigDecimal.fromString(amountsInUSD[i]));
    }

    for (let i = 0; i < amountsInUSD.length; i++) {
      if (amountsInUSD[i]) {
        let proportion = BigDecimal.fromString(amountsInUSD[i])
          .div(sum)
          .times(OneHundredBigDecimal);
        proportions.push(proportion.toString());
      } else {
        proportions.push("0");
      }
    }

    sharePriceDifference = sharePrice
      .minus(sharePriceOnCreation)
      .times(OneHundredBigDecimal);

    const currentTime = event.block.timestamp;
    const differenceInSeconds = currentTime.minus(vault.created);

    daysFromCreation = differenceInSeconds
      .div(BigInt.fromI32(60 * 60 * 24))
      .toString();

    if (BigDecimal.fromString(daysFromCreation).lt(OneBigDecimal)) {
      daysFromCreation = "1";
    }

    for (let i = 0; i < strategyAssets.length; i++) {
      let assetPrice: BigDecimal = BigDecimal.fromString(
        assetsPrice[strategyAssets[i].toString()].toString()
      ).div(EtherBigDecimal);

      let assetPriceOnCreation: BigDecimal = BigDecimal.fromString(
        vault.AssetsPricesOnCreation[i].toString()
      ).div(EtherBigDecimal);

      const startProportion: BigDecimal = OneBigDecimal.div(
        OneHundredBigDecimal
      ).times(BigDecimal.fromString(proportions[i]));

      const proportionPrice: BigDecimal =
        startProportion.div(assetPriceOnCreation);

      const presentAmount: BigDecimal = proportionPrice.times(assetPrice);

      const priceDifference: BigDecimal = assetPrice
        .minus(assetPriceOnCreation)
        .div(assetPriceOnCreation)
        .times(OneHundredBigDecimal);

      const percentDiff: BigDecimal =
        sharePriceDifference.minus(priceDifference);

      let yearPercentDiff = percentDiff
        .div(BigDecimal.fromString(daysFromCreation))
        .times(YearBigDecimal);

      if (yearPercentDiff.lt(BigDecimal.fromString("-100"))) {
        yearPercentDiff = BigDecimal.fromString("-99.99");
      }

      holdTokenPresentProportion.push(presentAmount.toString());
      holdTokenAPR.push(yearPercentDiff.toString());
    }

    const holdPrice = holdTokenPresentProportion.reduce(
      (acc: BigDecimal, cur: String) => acc.plus(BigDecimal.fromString(cur)),
      ZeroBigDecimal
    );

    const priceDifference: BigDecimal = holdPrice
      .minus(sharePriceOnCreation)
      .times(OneHundredBigDecimal);

    holdPercentDiff = sharePriceDifference.minus(priceDifference);

    holdYearPercentDiff = holdPercentDiff
      .div(BigDecimal.fromString(daysFromCreation))
      .times(YearBigDecimal);

    if (holdYearPercentDiff.lt(BigDecimal.fromString("-100"))) {
      holdYearPercentDiff = BigDecimal.fromString("-99.99");
    }
  }

  // ============================================ //
  vaultHistoryEntity.address = event.address;
  vaultHistoryEntity.sharePrice = vault.sharePrice;
  vaultHistoryEntity.TVL = vault.tvl;
  vaultHistoryEntity.timestamp = event.block.timestamp;
  vaultHistoryEntity.daysFromCreation = daysFromCreation;
  vaultHistoryEntity.vsHoldAPR = holdYearPercentDiff.toString();
  vaultHistoryEntity.tokensVsHoldAPR = holdTokenAPR;
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
  const vault = VaultEntity.load(event.address) as VaultEntity;
  const vaultContract = VaultContract.bind(event.address);
  let userAllDataEntity = UserAllDataEntity.load(
    event.params.owner
  ) as UserAllDataEntity;

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
  let userVault = UserVaultEntity.load(_VaultUserId) as UserVaultEntity;

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
    const userVault = UserVaultEntity.load(_VaultUserId) as UserVaultEntity;
    summ = summ.plus(userVault.deposited);
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
