import { BigInt } from "@graphprotocol/graph-ts";
import { SnapshotState } from "../../generated/schema";

export const SNAPSHOT_INTERVAL = BigInt.fromI32(600); // 10 minutes

export function shouldSnapshot(timestamp: BigInt): boolean {
  let state = SnapshotState.load("global");

  if (state == null) {
    state = new SnapshotState("global");
    state.lastSnapshotTimestamp = BigInt.zero();
    state.save();
  }

  return timestamp.ge(state.lastSnapshotTimestamp.plus(SNAPSHOT_INTERVAL));
}

export function updateSnapshotTimestamp(timestamp: BigInt): void {
  let state = SnapshotState.load("global")!;
  state.lastSnapshotTimestamp = timestamp;
  state.save();
}
