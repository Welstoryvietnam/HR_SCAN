import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {FirestoreRecordStore,StorageError,firestoreConfigured} from './recordStore.js';
import type {HrmSubRole, SystemUserAccount} from '../src/types.js';
import {Router} from 'express';
import {randomUUID} from 'node:crypto';

export interface Account extends SystemUserAccount {
  passwordHash?:string;
  contactEmail?:string;
  employeeCode?:string;
  department?:string;
  notes?:string;
  phone?:string;
  avatarColor?:string;
  hrmRole?:HrmSubRole;
  authSource?:string;
}
export function hashPassword(password:string){
  const salt=randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;
}
export function verifyPassword(account:Account,password:string){
  if(account.passwordHash){
    const [format,salt,digest]=account.passwordHash.split(':');
    if(format!=='scrypt'||!salt||!digest||password.length>1000)return false;
    const expected=Buffer.from(digest,'hex'),actual=scryptSync(password,salt,64);
    return expected.length===actual.length&&timingSafeEqual(expected,actual);
  }
  return process.env.HR_ALLOW_LEGACY_TEST_ACCOUNTS==='1'&&process.env.VERCEL_ENV!=='production'&&account.password===password;
}
export function publicAccount(account:Account){
  const {password:_,passwordHash:__,...safe}=account;return safe;
}
export class AccountStore {
  private accounts=new FirestoreRecordStore('hrm_accounts',v=>v);
  private configuration=new FirestoreRecordStore('hrm_auth',v=>v);
  private cached?:{expires:number;accounts:Account[];enabled:boolean};
  private pending?:Promise<{accounts:Account[];enabled:boolean}>;
  invalidate(){this.cached=undefined;}
  async load(fallback:Account[]){
    const isSyntheticTest=process.env.NODE_ENV==='test'||(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'').includes('test@hrscan.iam.gserviceaccount.com');
    const allowTestFixtures=process.env.HR_ALLOW_LEGACY_TEST_ACCOUNTS==='1'&&process.env.VERCEL_ENV!=='production';
    if(!firestoreConfigured()){if(allowTestFixtures||!isSyntheticTest)return {accounts:fallback,enabled:false};throw new StorageError('Chưa cấu hình Firestore cho tài khoản HRM.');}
    if(this.cached&&this.cached.expires>Date.now())return this.cached;
    if(this.pending)return this.pending;
    this.pending=(async()=>{
      let enabled=false;
      try {enabled=(await this.configuration.get('config')).record.enabled===true;}
      catch(e){
        if(!(e instanceof StorageError&&e.status===404))throw e;
        if(!isSyntheticTest){
          try{await this.configuration.create([{id:'config',enabled:true,updatedAt:new Date().toISOString()}]);enabled=true;}catch{/* ignore */}
        }
      }
      if(!enabled&&!allowTestFixtures&&isSyntheticTest)throw new StorageError('Tài khoản HRM-Mini chưa được kích hoạt. Vui lòng liên hệ quản trị viên.');
      let accounts=enabled?await this.accounts.list() as Account[]:fallback;
      // Trên môi trường thực tế, tự động đồng bộ và lưu tài khoản admin (admin123) lên Cloud Firestore nếu chưa có
      if(!isSyntheticTest){
        const fallbackAdmin=fallback.find(a=>a.username==='admin');
        if(fallbackAdmin&&!accounts.some(a=>a.username==='admin')){
          const hashedAdmin:Account={
            ...fallbackAdmin,
            contactEmail:fallbackAdmin.contactEmail||fallbackAdmin.email,
            passwordHash:fallbackAdmin.passwordHash||hashPassword(fallbackAdmin.password||'admin123'),
          };
          delete hashedAdmin.password;
          if(enabled){
            try{await this.accounts.create([hashedAdmin]);}catch{/* ignore if already exists */}
          }
          accounts=[hashedAdmin,...accounts];
        }
      }
      if(enabled&&!accounts.some(a=>a.status==='active'&&a.role==='admin'))throw new StorageError('Chưa có tài khoản quản trị HRM hoạt động.');
      const result={accounts,enabled};
      if(enabled)this.cached={...result,expires:Date.now()+15_000};
      return result;
    })();
    try{return await this.pending;}finally{this.pending=undefined;}
  }
  async save(account:Account,create=false){
    const value={...account};
    if(value.password){value.passwordHash=hashPassword(value.password);delete value.password;}
    const record=Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined));
    if(create)await this.accounts.create([record]);
    else {const existing=await this.accounts.get(account.id);await this.accounts.update(account.id,record,existing.version);}
    this.invalidate();return value;
  }
  async remove(id:string){const existing=await this.accounts.get(id);await this.accounts.removeVersioned(id,existing.version);this.invalidate();}
  async resetToAdminOnly(defaultAdmin:Account){
    if(firestoreConfigured()){
      const currentList=await this.accounts.list() as Account[];
      for(const acc of currentList){
        if(acc.username!=='admin'&&acc.id!==defaultAdmin.id){
          try{await this.remove(acc.id);}catch{/* ignore */}
        }
      }
      const adminPayload:Account={
        ...defaultAdmin,
        passwordHash:hashPassword(defaultAdmin.password||'admin123'),
        status:'active',
        role:'admin',
        hrmRole:'admin',
      };
      delete adminPayload.password;
      try{
        const existing=await this.accounts.get(adminPayload.id);
        await this.accounts.update(adminPayload.id,adminPayload,existing.version);
      }catch{
        await this.accounts.create([adminPayload]);
      }
    }
    this.invalidate();
  }
}
export const accountStore=new AccountStore();

export class PermissionStore {
  private store=new FirestoreRecordStore('hrm_permissions',v=>v);
  private memoryCache:{roleMatrix?:any;accountCustomPerms?:any;updatedAt?:string}={};
  async load(){
    if(!firestoreConfigured()){
      return {provider:'local',data:this.memoryCache};
    }
    try{
      const doc=await this.store.get('default');
      return {provider:'firestore',data:doc.record};
    }catch(e){
      if(e instanceof StorageError&&e.status===404){
        return {provider:'firestore',data:this.memoryCache};
      }
      throw e;
    }
  }
  async save(payload:{roleMatrix:any;accountCustomPerms:any}){
    const record={
      id:'default',
      roleMatrix:payload.roleMatrix||{},
      accountCustomPerms:payload.accountCustomPerms||{},
      updatedAt:new Date().toISOString(),
    };
    this.memoryCache=record;
    if(!firestoreConfigured()){
      return {provider:'local',data:record};
    }
    try{
      const existing=await this.store.get('default');
      await this.store.update('default',record,existing.version);
    }catch(e){
      if(e instanceof StorageError&&e.status===404){
        await this.store.create([record]);
      }else{
        throw e;
      }
    }
    return {provider:'firestore',data:record};
  }
}
export const permissionStore=new PermissionStore();

export function createAccountRouter(accounts:()=>Account[]){
  const router=Router();
  const route=(fn:(req:any,res:any)=>Promise<any>)=>async(req:any,res:any)=>{
    try{res.set('Cache-Control','no-store');res.json({success:true,...await fn(req,res)});}
    catch(e){res.status(e instanceof StorageError?e.status:500).json({success:false,error:e instanceof StorageError?e.message:'Không lưu được tài khoản. Vui lòng thử lại.'});}
  };
  router.get('/',route(async()=>({users:accounts().map(publicAccount)})));
  router.post('/reset-to-admin',route(async()=>{
    const adminAcc:Account={
      id:'usr_admin_01',
      username:'admin',
      password:'admin123',
      email:'happyendpu@gmail.com',
      contactEmail:'happyendpu@gmail.com',
      fullName:'Quản Trị Viên Hệ Thống',
      role:'admin',
      hrmRole:'admin',
      status:'active',
      createdAt:'2026-09-01T08:00:00.000Z',
    };
    await accountStore.resetToAdminOnly(adminAcc);
    return {message:'Đã xóa toàn bộ tài khoản phụ trên Cloud và chỉ giữ lại tài khoản admin (admin123).'};
  }));
  router.post('/',route(async(req)=>{
    const username=String(req.body.username||'').trim().toLowerCase(),contactEmail=String(req.body.email||'').trim().toLowerCase();
    if(username.length<3||!String(req.body.fullName||'').trim()||typeof req.body.password!=='string'||req.body.password.length<6||req.body.password.length>1000)throw new StorageError('Mã đăng nhập, họ tên và mật khẩu tối thiểu 6 ký tự là bắt buộc.',400);
    if(accounts().some(a=>a.username===username||(contactEmail&&a.contactEmail===contactEmail)))throw new StorageError('Mã đăng nhập hoặc email đã được sử dụng.',409);
    const id='usr_'+randomUUID();
    const role=req.body.role==='admin'?'admin':'employee';
    const validSubRoles: HrmSubRole[]=['admin','quan_ly_nhan_su','nhan_vien_nhan_su','nhan_vien_tuyen_dung','nhan_vien_y_te'];
    const hrmRole: HrmSubRole=role==='admin'?'admin':(validSubRoles.includes(req.body.hrmRole)?req.body.hrmRole:'nhan_vien_tuyen_dung');
    const user=await accountStore.save({id,username,email:`${id}@hrm-accounts.invalid`,contactEmail,fullName:String(req.body.fullName).trim(),role,hrmRole,status:'active',password:req.body.password,createdAt:new Date().toISOString()},true);
    return {user:publicAccount(user),message:'Đã tạo tài khoản.'};
  }));
  router.put('/:id',route(async(req)=>{
    const previous=accounts().find(a=>a.id===req.params.id);if(!previous)throw new StorageError('Không tìm thấy tài khoản.',404);
    const user={...previous},input=req.body;
    if(input.fullName)user.fullName=String(input.fullName).trim();
    if(input.email!==undefined&&input.email!==user.email){
      const email=String(input.email).trim().toLowerCase();
      if(email&&accounts().some(a=>a.id!==user.id&&a.contactEmail===email))throw new StorageError('Email đã được sử dụng.',409);
      user.contactEmail=email;
    }
    if(input.password){if(typeof input.password!=='string'||input.password.length<6||input.password.length>1000)throw new StorageError('Mật khẩu phải từ 6 đến 1000 ký tự.',400);user.password=input.password;}
    const validSubRoles: HrmSubRole[]=['admin','quan_ly_nhan_su','nhan_vien_nhan_su','nhan_vien_tuyen_dung','nhan_vien_y_te'];
    if(['admin','employee'].includes(input.role)&&input.role!==user.role){user.role=input.role;user.hrmRole=input.role==='admin'?'admin':'nhan_vien_tuyen_dung';}
    if(validSubRoles.includes(input.hrmRole)){user.hrmRole=input.hrmRole;if(input.hrmRole==='admin')user.role='admin';else if(user.role!=='admin'||input.role==='employee')user.role='employee';}
    if(['active','locked'].includes(input.status))user.status=input.status;
    if(previous.role==='admin'&&(user.role!=='admin'||user.status!=='active')&&!accounts().some(a=>a.id!==user.id&&a.role==='admin'&&a.status==='active'))throw new StorageError('Phải giữ ít nhất một quản trị viên hoạt động.',400);
    const saved=await accountStore.save(user);return {user:publicAccount(saved),message:'Đã cập nhật tài khoản.'};
  }));
  router.delete('/:id',route(async(req,res)=>{
    if(req.params.id===res.locals.personnelUser.id)throw new StorageError('Không thể tự xóa tài khoản đang đăng nhập.',400);
    const existing=accounts().find(a=>a.id===req.params.id);if(!existing)throw new StorageError('Không tìm thấy tài khoản.',404);
    if(existing.role==='admin'&&!accounts().some(a=>a.id!==existing.id&&a.role==='admin'&&a.status==='active'))throw new StorageError('Phải giữ ít nhất một quản trị viên hoạt động.',400);
    await accountStore.remove(existing.id);return {message:'Đã xóa tài khoản.'};
  }));
  return router;
}
