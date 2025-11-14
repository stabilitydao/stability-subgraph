import {
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
} from "../../generated/templates/ACLManager/ACLManagerABI";

import { ACLRoleEntity } from "../../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { ACLManagerABI as ACLManager } from "../../generated/templates/ACLManager/ACLManagerABI";
import { PoolAddressProviderABI as PoolAddressProvider } from "../../generated/templates/ACLManager/PoolAddressProviderABI";

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let id = buildId(
    event.params.role,
    event.params.account,
    event.transaction.hash,
    event.logIndex
  );

  let role = new ACLRoleEntity(id);

  const aclManagerContract = ACLManager.bind(event.address);

  const addressProvider = aclManagerContract.ADDRESSES_PROVIDER();

  const addressProviderContract = PoolAddressProvider.bind(addressProvider);

  const pool = addressProviderContract.getPool();

  role.roleName = resolveRoleName(event.params.role, aclManagerContract);

  role.role = event.params.role;
  role.account = event.params.account;
  role.sender = event.params.sender;
  role.poolAddressProvider = addressProvider;
  role.pool = pool;
  role.timestamp = event.block.timestamp;
  role.blockNumber = event.block.number;
  role.transactionHash = event.transaction.hash;

  role.active = true;

  role.save();
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let id = buildId(
    event.params.role,
    event.params.account,
    event.transaction.hash,
    event.logIndex
  );

  let role = new ACLRoleEntity(id);

  const aclManagerContract = ACLManager.bind(event.address);

  const addressProvider = aclManagerContract.ADDRESSES_PROVIDER();

  const addressProviderContract = PoolAddressProvider.bind(addressProvider);

  const pool = addressProviderContract.getPool();

  role.roleName = resolveRoleName(event.params.role, aclManagerContract);

  role.role = event.params.role;
  role.account = event.params.account;
  role.sender = event.params.sender;
  role.pool = pool;
  role.poolAddressProvider = addressProvider;
  role.timestamp = event.block.timestamp;
  role.blockNumber = event.block.number;
  role.transactionHash = event.transaction.hash;
  role.active = false;

  role.save();
}

function buildId(
  role: Bytes,
  account: Bytes,
  txHash: Bytes,
  logIndex: BigInt
): string {
  return (
    role.toHexString() +
    "-" +
    account.toHexString() +
    "-" +
    txHash.toHexString() +
    "-" +
    logIndex.toString()
  );
}

function resolveRoleName(role: Bytes, acl: ACLManager): string {
  let assetListing = acl.ASSET_LISTING_ADMIN_ROLE();
  let bridge = acl.BRIDGE_ROLE();
  let defaultAdmin = acl.DEFAULT_ADMIN_ROLE();
  let emergency = acl.EMERGENCY_ADMIN_ROLE();
  let flashBorrower = acl.FLASH_BORROWER_ROLE();
  let poolAdmin = acl.POOL_ADMIN_ROLE();
  let riskAdmin = acl.RISK_ADMIN_ROLE();

  if (role.equals(assetListing)) return "ASSET_LISTING_ADMIN_ROLE";
  if (role.equals(bridge)) return "BRIDGE_ROLE";
  if (role.equals(defaultAdmin)) return "DEFAULT_ADMIN_ROLE";
  if (role.equals(emergency)) return "EMERGENCY_ADMIN_ROLE";
  if (role.equals(flashBorrower)) return "FLASH_BORROWER_ROLE";
  if (role.equals(poolAdmin)) return "POOL_ADMIN_ROLE";
  if (role.equals(riskAdmin)) return "RISK_ADMIN_ROLE";

  return "UNKNOWN_ROLE";
}
