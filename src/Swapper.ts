
import { Address } from "@graphprotocol/graph-ts"
import { PlatformEntity  } from "../generated/schema"
import { platformAddress } from './constants'
import { BlueChipAdded as BlueChipAddedEvent } from "../generated/templates/SwapperData/SwapperABI"

export function handleBlueChipAdded(event: BlueChipAddedEvent): void {
    const platform = PlatformEntity.load(Address.fromString(platformAddress)) as PlatformEntity;
    let bcAssets = platform.bcAssets
    if (!bcAssets) {
      bcAssets = [];
    }
    if(!bcAssets.includes(event.params.poolData.tokenIn)){
      bcAssets.push(event.params.poolData.tokenIn)
    }
    if(!bcAssets.includes(event.params.poolData.tokenOut)){
      bcAssets.push(event.params.poolData.tokenOut)
    }
    platform.bcAssets = bcAssets
    platform.save()
  }  