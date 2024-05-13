import {
  LastFeeAMLEntity,
  DefiEdgePoolsAndStrategiesEntity,
} from "../generated/schema";
import { Address, Bytes, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { ChangeProtocolPerformanceFee as ChangeProtocolPerformanceFeeEvent } from "../generated/templates/DefiEdgeFactoryData/DefiEdgeFactoryABI";
import { DefiEdgeStrategyABI } from "../generated/templates/FactoryData/DefiEdgeStrategyABI";
import { DefiEdgeQuickSwapMerklFarmDataABI } from "../generated/templates/FactoryData/DefiEdgeQuickSwapMerklFarmDataABI";
import { DefiEdgeQuickSwapMerklFarmData } from "../generated/templates";
import { DefiEdgeManagerABI } from "../generated/templates/FactoryData/DefiEdgeManagerABI";
import { DefiEdgeFactoryABI } from "../generated/templates/FactoryData/DefiEdgeFactoryABI";
import {
  addressZero,
  defiedgeFactoryAddress,
  factoryAddress,
} from "../src/constants";

export function handleChangeProtocolPerformanceFee(
  event: ChangeProtocolPerformanceFeeEvent
): void {
  //1) Узнать, там стратегия или пул
  //Если стратегия, то действуем как обычно
  //Если пул, то идем в сущность DefiEdgePool, где будут два массива. Первый массив пулов, второй стратегий
  //Ищем по первому массиву пулов совпадение с пулом из события и записываем индекс
  //По этому индексу вытаскиваем из второго массива нужную стратегию

  //Есть ли у defiedge в factory что-то наподобие нашего isStrategy?
  const factoryContract = DefiEdgeFactoryABI.bind(
    Address.fromString(defiedgeFactoryAddress)
  );
  const isStrategy = factoryContract.isValidStrategy(
    event.params.strategyOrPool
  );

  const defiEdgePoolsAndStrategies = DefiEdgePoolsAndStrategiesEntity.load(
    Address.fromString(defiedgeFactoryAddress)
  ) as DefiEdgePoolsAndStrategiesEntity;

  if (isStrategy) {
    let strategyAddress = Address.fromString(addressZero);
    for (let i = 0; i < defiEdgePoolsAndStrategies.strategies.length; i++) {
      if (
        defiEdgePoolsAndStrategies.strategies[i] == event.params.strategyOrPool
      ) {
        strategyAddress = Address.fromBytes(
          defiEdgePoolsAndStrategies.strategies[i]
        );
        break;
      }
    }

    const strategyContract = DefiEdgeStrategyABI.bind(strategyAddress);

    const underlying = strategyContract.underlying();

    const lastFeeAMLEntity = LastFeeAMLEntity.load(
      underlying
    ) as LastFeeAMLEntity;
    const underlyingContract =
      DefiEdgeQuickSwapMerklFarmDataABI.bind(underlying);
    const managerContract = DefiEdgeManagerABI.bind(
      underlyingContract.manager()
    );

    const managerFee = managerContract.performanceFeeRate();
    const factoryFee = factoryContract.getProtocolPerformanceFeeRate(
      strategyContract.pool(),
      strategyAddress
    );
    lastFeeAMLEntity.fee = managerFee
      .plus(factoryFee)
      .div(BigInt.fromI32(100 * 10 ** 4)); //fee/100e6*100
    lastFeeAMLEntity.managerFee = managerFee;
    lastFeeAMLEntity.factoryFee = factoryFee;
    lastFeeAMLEntity.total_fee = BigInt.fromI32(999999); //managerFee.plus(factoryFee)
    lastFeeAMLEntity.save();
  } else {
    //const defiEdgePoolsAndStrategies = DefiEdgePoolsAndStrategiesEntity.load(Address.fromString(defiedgeFactoryAddress)) as DefiEdgePoolsAndStrategiesEntity;
    let strategyAddress = Address.fromString(addressZero);
    for (let i = 0; i < defiEdgePoolsAndStrategies.pools.length; i++) {
      if (defiEdgePoolsAndStrategies.pools[i] == event.params.strategyOrPool) {
        strategyAddress = Address.fromBytes(
          defiEdgePoolsAndStrategies.strategies[i]
        );
        break;
      }
    }

    const strategyContract = DefiEdgeStrategyABI.bind(strategyAddress);
    const underlying = strategyContract.underlying();
    const lastFeeAMLEntity = LastFeeAMLEntity.load(
      underlying
    ) as LastFeeAMLEntity;
    const underlyingContract =
      DefiEdgeQuickSwapMerklFarmDataABI.bind(underlying);
    const managerContract = DefiEdgeManagerABI.bind(
      underlyingContract.manager()
    );
    // pool = underlying
    // strategy strategyAddress
    const managerFee = BigInt.fromI32(999); //managerContract.performanceFeeRate()
    const factoryFee = BigInt.fromI32(666); //factoryContract.getProtocolPerformanceFeeRate(underlying, strategyAddress)
    lastFeeAMLEntity.fee = managerFee
      .plus(factoryFee)
      .div(BigInt.fromI32(100 * 10 ** 4)); //fee/100e6*100
    lastFeeAMLEntity.managerFee = managerFee;
    lastFeeAMLEntity.factoryFee = factoryFee;
    lastFeeAMLEntity.total_fee = BigInt.fromI32(999999); //managerFee.plus(factoryFee)
    lastFeeAMLEntity.save();
  }
}
