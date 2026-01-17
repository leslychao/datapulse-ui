import {AccountMember} from "../shared/models";
import {MemberVm} from "../vm/member.vm";

export const mapAccountMemberToVm = (member: AccountMember): MemberVm => {
  return {
    id: member.id,
    role: member.role,
    status: member.status
  };
};
