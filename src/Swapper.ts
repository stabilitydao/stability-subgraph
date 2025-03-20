import { Address, store } from "@graphprotocol/graph-ts";

import { PlatformEntity, PoolEntity, BCPoolEntity } from "../generated/schema";
import {
  BlueChipAdded as BlueChipAddedEvent,
  PoolAdded as PoolAddedEvent,
  PoolRemoved as PoolRemovedEvent,
  BlueChipPoolRemoved as BlueChipPoolRemovedEvent,
} from "../generated/templates/SwapperData/SwapperABI";

import { platformAddress } from "./utils/constants";

export function handleBlueChipAdded(event: BlueChipAddedEvent): void {
  /**** BCPools ****/

  const BCPoolByTokenIn = new BCPoolEntity(
    `${event.params.poolData.tokenIn.toHexString()}-${event.params.poolData.tokenOut.toHexString()}`
  );
  const BCPoolByTokenOut = new BCPoolEntity(
    `${event.params.poolData.tokenOut.toHexString()}-${event.params.poolData.tokenIn.toHexString()}`
  );

  BCPoolByTokenIn.pool = event.params.poolData.pool;
  BCPoolByTokenOut.pool = event.params.poolData.pool;

  BCPoolByTokenIn.ammAdapter = event.params.poolData.ammAdapter;
  BCPoolByTokenOut.ammAdapter = event.params.poolData.ammAdapter;

  BCPoolByTokenIn.tokenIn = event.params.poolData.tokenIn;
  BCPoolByTokenOut.tokenIn = event.params.poolData.tokenIn;

  BCPoolByTokenIn.tokenOut = event.params.poolData.tokenOut;
  BCPoolByTokenOut.tokenOut = event.params.poolData.tokenOut;

  BCPoolByTokenIn.save();
  BCPoolByTokenOut.save();

  /**** BCPools ****/

  const platform = PlatformEntity.load(
    Address.fromString(platformAddress)
  ) as PlatformEntity;

  let bcAssets = platform.bcAssets;
  if (!bcAssets) {
    bcAssets = [];
  }
  if (!bcAssets.includes(event.params.poolData.tokenIn)) {
    bcAssets.push(event.params.poolData.tokenIn);
  }
  if (!bcAssets.includes(event.params.poolData.tokenOut)) {
    bcAssets.push(event.params.poolData.tokenOut);
  }
  platform.bcAssets = bcAssets;
  platform.save();
}

export function handleBlueChipRemoved(event: BlueChipPoolRemovedEvent): void {
  const poolId = `${event.params.tokenIn.toHexString()}-${event.params.tokenOut.toHexString()}`;

  if (BCPoolEntity.load(poolId)) {
    store.remove("BCPoolEntity", poolId);
  }
}

export function handlePoolAdded(event: PoolAddedEvent): void {
  const pool = new PoolEntity(event.params.poolData.pool.toHexString());

  pool.ammAdapter = event.params.poolData.ammAdapter;

  pool.tokenIn = event.params.poolData.tokenIn;

  pool.tokenOut = event.params.poolData.tokenOut;

  pool.assetAdded = event.params.assetAdded;

  pool.save();
}

export function handlePoolRemoved(event: PoolRemovedEvent): void {
  const poolId = event.params.token.toHexString();

  if (PoolEntity.load(poolId)) {
    store.remove("PoolEntity", poolId);
  }
}
