import {createHash} from 'node:crypto';
import {hashPassword,type Account} from './accountStore.js';
import {StorageError} from './recordStore.js';

export function planHrmAccounts(source:any){
  if(!Array.isArray(source?.employees)||!source.employees.length)throw new StorageError('Thiếu danh sách tài khoản HRM-Mini.',400);
  const usernames=new Set<string>(),contacts=new Set<string>();
  const accounts:Account[]=source.employees.map((employee:any)=>{
    const code=String(employee.id||'').trim().toLowerCase();
    if(!code||usernames.has(code)||!employee.name||typeof employee.password!=='string'||!employee.password||employee.password.length>1000)throw new StorageError('Tài khoản thiếu mã, tên, mật khẩu hoặc bị trùng.',400);
    usernames.add(code);
    const hrmRole=employee.role;
    if(!['admin','quan_ly_nhan_su','nhan_vien_nhan_su'].includes(hrmRole))throw new StorageError('Vai trò HRM-Mini chưa được đối chiếu.',400);
    const contactEmail=String(employee.email||'').trim().toLowerCase();
    if(contactEmail&&contacts.has(contactEmail))throw new StorageError('Email liên hệ bị trùng; cần đối chiếu trước khi chuyển.',400);
    if(contactEmail)contacts.add(contactEmail);
    const id=`legacy_employee_${createHash('sha256').update(JSON.stringify(String(employee.id).trim())).digest('hex').slice(0,24)}`;
    // Stable internal principal, not a fabricated contact address. Never used for sending mail.
    return {id,username:code,employeeCode:code,email:`${code}@hrm-accounts.invalid`,contactEmail,fullName:String(employee.name).trim(),department:String(employee.department||'HR Group'),notes:String(employee.notes||''),phone:String(employee.phone||''),avatarColor:String(employee.avatarColor||''),role:hrmRole==='nhan_vien_nhan_su'?'employee':'admin',hrmRole,status:'active',passwordHash:hashPassword(employee.password),createdAt:new Date().toISOString(),authSource:'HRM-Mini'};
  });
  if(!accounts.some(a=>a.role==='admin'))throw new StorageError('Thiếu tài khoản quản trị từ HRM-Mini.',400);
  return accounts;
}
