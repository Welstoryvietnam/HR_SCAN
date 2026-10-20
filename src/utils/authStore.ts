import type {SystemUserAccount,UserProfile} from '../types';
import {safeFetchJson} from './apiHelper';
const key='hr_user_accounts';
export function getStoredAccounts():SystemUserAccount[]{try{return JSON.parse(localStorage.getItem(key)||'[]').map(({password,passwordHash,...account}:any)=>account);}catch{return [];}}
export function saveStoredAccounts(accounts:SystemUserAccount[]){localStorage.setItem(key,JSON.stringify(accounts.map(({password,passwordHash,...account}:any)=>account)));}
export async function authenticateUser(identifier:string,password:string):Promise<{success:boolean;user?:UserProfile;error?:string}>{
 const result=await safeFetchJson<{success:boolean;user?:UserProfile;error?:string}>('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:identifier.trim(),password})});
 if(result.ok&&result.data?.success&&result.data.user?.sessionToken)return {success:true,user:result.data.user};
 return {success:false,error:result.data?.error||result.error||'Không thể đăng nhập máy chủ. Vui lòng thử lại.'};
}
export async function requestPasswordReset(email:string):Promise<{success:boolean;message:string;error?:string;simulatedCode?:string}>{
 const result=await safeFetchJson<{success:boolean;message?:string;error?:string}>('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim().toLowerCase()})});
 return {success:!!(result.ok&&result.data?.success),message:result.data?.message||'',error:result.data?.error||result.error};
}
export async function confirmPasswordReset(email:string,code:string,newPassword:string):Promise<{success:boolean;message?:string;error?:string}>{
 const result=await safeFetchJson<{success:boolean;message?:string;error?:string}>('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim().toLowerCase(),code:code.trim(),newPassword})});
 return {success:!!(result.ok&&result.data?.success),message:result.data?.message,error:result.data?.error||result.error};
}
