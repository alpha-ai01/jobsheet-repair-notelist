# SmartRepair Firestore v2 — Workspace Data Model

## เป้าหมาย
- 1 Workspace = 1 ร้าน / 1 กลุ่ม / 1 ที่เก็บข้อมูล
- บัญชีเดียวสามารถอยู่ได้หลาย Workspace
- ข้อมูลของแต่ละร้านแยกกันตั้งแต่ path ของ Firestore
- สิทธิ์ยึดตาม membership ภายใน Workspace
- รองรับ Owner / Admin / Manager / Member
- เตรียมรองรับ Invitation, Subscription, Audit Log และ Export ราย Workspace

## โครงสร้าง
```text
/users/{uid}

/workspaces/{workspaceId}
    ownerUid
    name
    status
    plan
    subscriptionStatus
    memberLimit
    createdAt
    updatedAt

/workspaces/{workspaceId}/members/{uid}
/workspaces/{workspaceId}/repairs/{repairId}
/workspaces/{workspaceId}/repairs/{repairId}/statusHistory/{historyId}
/workspaces/{workspaceId}/customers/{customerId}
/workspaces/{workspaceId}/references/{referenceId}
/workspaces/{workspaceId}/invitations/{inviteId}
/workspaces/{workspaceId}/auditLogs/{logId}
```

## Role hierarchy
```text
owner   = 4
admin   = 3
manager = 2
member  = 1
```

- Owner จัดการ Admin / Manager / Member
- Admin จัดการ Manager / Member
- Manager จัดการ Member
- Member จัดการสิทธิ์ไม่ได้
- ผู้ใช้ห้ามเพิ่มสิทธิ์ตัวเอง
- Transfer Ownership ควรทำผ่าน trusted backend

## Job locking
สำหรับ Member:
- สร้าง Job ได้
- อ่าน Job ใน Workspace ของตัวเองได้
- แก้ Job ได้เฉพาะเมื่อยังไม่ `done`/`cancelled`
- จำกัดการแก้ข้อมูลสำคัญภายใน 3 ชั่วโมงจาก `createdAt`
- ใช้ server time เป็นหลัก
- งานที่ปิดแล้วล็อกทันที

Manager/Admin/Owner:
- แก้ Job ได้ตามนโยบายร้าน
- Re-open ในอนาคตต้องมีเหตุผลและ Audit Log

## Status History
ทุกการเปลี่ยนสถานะสร้าง document ใหม่:
```text
/workspaces/{workspaceId}/repairs/{repairId}/statusHistory/{historyId}
```
History เป็น append-only: create ได้ แต่ client update/delete ไม่ได้

## Subscription
Workspace เตรียมสถานะ:
```text
trial
active
past_due
grace_period
read_only
cancelled
```

Subscription = สิทธิ์ใช้ feature
Role = สิทธิ์ของสมาชิกใน Workspace

## Migration v1 -> v2
1. Backup collection เดิม
2. สร้าง Workspace แรก
3. สร้าง Owner membership
4. Copy repairs/customers/references ไปใต้ Workspace
5. ตรวจจำนวน document
6. รัน Rules v2 Emulator tests
7. เปลี่ยน frontend ให้ใช้ activeWorkspaceId
8. Smoke test
9. ค่อย retire path เดิม

ห้ามลบข้อมูล v1 ก่อน migration verification สำเร็จ
