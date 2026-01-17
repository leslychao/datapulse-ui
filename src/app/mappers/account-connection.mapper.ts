import {AccountConnection} from "../shared/models";
import {ConnectionVm} from "../vm/connection.vm";

export const mapAccountConnectionToVm = (connection: AccountConnection): ConnectionVm => {
  return {
    id: connection.id,
    marketplace: connection.marketplace,
    active: connection.active,
    lastSyncAt: connection.lastSyncAt ?? "—",
    lastSyncStatus: connection.lastSyncStatus ?? "—"
  };
};
