export const Permissions = {
    JOBSHEET_CREATE: "jobsheet.create",
    JOBSHEET_VIEW_ALL: "jobsheet.view.all",
    JOBSHEET_VIEW_OWN: "jobsheet.view.own",
    JOBSHEET_EDIT_ALL: "jobsheet.edit.all",
    JOBSHEET_EDIT_OWN: "jobsheet.edit.own",
    JOBSHEET_STATUS_CHANGE: "jobsheet.status.change",
    JOBSHEET_ARCHIVE: "jobsheet.archive",
    MEMBER_VIEW: "member.view",
    MEMBER_INVITE: "member.invite",
    MEMBER_EDIT: "member.edit",
    PERMISSION_MANAGE: "permission.manage",
    GROUP_MANAGE: "group.manage"
};

export const Roles = {
    OWNER: "owner",
    MANAGER: "manager",
    MEMBER: "member"
};

export const DefaultPermissions = {
    [Roles.OWNER]: Object.values(Permissions),
    [Roles.MANAGER]: [
        Permissions.JOBSHEET_CREATE,
        Permissions.JOBSHEET_VIEW_ALL,
        Permissions.JOBSHEET_EDIT_ALL,
        Permissions.JOBSHEET_STATUS_CHANGE
    ],
    [Roles.MEMBER]: [
        Permissions.JOBSHEET_CREATE,
        Permissions.JOBSHEET_VIEW_OWN,
        Permissions.JOBSHEET_EDIT_OWN,
        Permissions.JOBSHEET_STATUS_CHANGE
    ]
};
