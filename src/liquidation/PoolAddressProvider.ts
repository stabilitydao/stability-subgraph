import { Address } from "@graphprotocol/graph-ts";
import {
  ProxyCreated,
  ACLManagerUpdated,
} from "../../generated/Brunch gen2/PoolAddressProviderABI";
import {
  Pool as PoolTemplate,
  ACLManager as ACLManagerTemplate,
} from "../../generated/templates";

export function handleProxyCreated(event: ProxyCreated): void {
  PoolTemplate.create(event.params.proxyAddress);
}

export function handleACLManagerUpdated(event: ACLManagerUpdated): void {
  let newACL = event.params.newAddress;
  if (newACL.notEqual(Address.zero())) {
    ACLManagerTemplate.create(newACL);
  }
}
