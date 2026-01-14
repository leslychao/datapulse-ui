import {AccountConnection} from "../shared/models";
import {ConnectionVm} from "../vm/connection.vm";

export const mapAccountConnectionToVm = (connection: AccountConnection): ConnectionVm => {
  return {
    id: connection.id,
    name: connection.name,
    status: connection.status,
    marketplace: connection.marketplace,
    lastSyncAt: connection.lastSyncAt ?? "—"
  };
};
