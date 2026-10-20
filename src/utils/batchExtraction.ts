import type { BatchEmployeeDraft, EmployeeDocumentGroup, DocumentExtractionResult } from '../types';
export const documentKey = (group:EmployeeDocumentGroup) => 'ocr-v11:'+JSON.stringify(group.documents.map(doc=>[doc.id,doc.docType,doc.base64Data.length]));
export function prepareEmployees(groups:EmployeeDocumentGroup[],previous:BatchEmployeeDraft[]):BatchEmployeeDraft[] {
  return groups.map(group=>{
    const old = previous.find(employee=>employee.id===group.id);
    const unchanged = old?.extractionDocumentKey === documentKey(group);
    return {...{id:group.id,hoVaTen:group.label.toUpperCase(),ngaySinh:'',gioiTinh:'',soCCCD:'',queQuan:'',diaChiThuongTru:'',soDienThoai:''},...old,
      id:group.id,soTaiLieuDinhKem:group.documents.length,extractionStatus:unchanged && old?.extractionStatus==='success' ? 'success' : 'waiting',
      aiVisionExtracted:unchanged ? old?.aiVisionExtracted : false};
  });
}
export type ExtractReply = {ok:boolean;data?:{success:boolean;data?:DocumentExtractionResult;error?:string;retryable?:boolean;retryAfterSeconds?:number};error?:string};
export async function runBatchExtraction(options:{groups:EmployeeDocumentGroup[];previous:BatchEmployeeDraft[];
  extract:(group:EmployeeDocumentGroup)=>Promise<ExtractReply>;
  progress:(employees:BatchEmployeeDraft[],message:string)=>Promise<void>|void;
  cancelled?:()=>boolean;sleep?:(ms:number)=>Promise<void>;random?:()=>number;
}) {
  let employees=prepareEmployees(options.groups,options.previous);
  const sleep=options.sleep || (ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  const publish=async (message:string)=>options.progress(employees.map(employee=>({...employee})),message);
  await publish('Đã xếp hàng hồ sơ.');
  for(let index=0;index<options.groups.length;index++) {
    if(options.cancelled?.()) break;
    const group=options.groups[index];
    if(employees[index].extractionStatus==='success') continue;
    if(!group.documents.length) {
      employees[index]={...employees[index],extractionStatus:'failed',extractionError:'Chưa có tài liệu. Bạn có thể nhập tay tại Bước 2.'};
      await publish(`Nhân viên ${index+1} chưa có tài liệu.`);continue;
    }
    for(let attempt=0;attempt<3;attempt++) {
      if(options.cancelled?.()) break;
      employees[index]={...employees[index],extractionStatus:'running',extractionError:''};
      await publish(`Đang OCR nhân viên ${index+1}/${options.groups.length}${attempt ? ` (thử lại ${attempt})` : ''}…`);
      let reply:ExtractReply;
      try { reply=await options.extract(group); } catch {reply={ok:false,error:'Mất kết nối. Hãy thử lại riêng hồ sơ này.'};}
      if(reply.ok && reply.data?.success && reply.data.data) {
        const updates={...reply.data.data};
        const previous=options.previous.find(employee=>employee.id===group.id);
        const sameFiles=previous?.extractionDocumentKey?.split(':').slice(1).join(':')===documentKey(group).split(':').slice(1).join(':');
        if(sameFiles && previous) {
          // A new OCR version may find more fields, but a blank result must not
          // erase a value HR already corrected on these same source files.
          for(const key of ['gioiTinh','danToc','tinhTrangHonNhan','ngaySinh','soCCCD','ngayCap','ngayHetHanCCCD','noiCap','queQuan','diaChiThuongTru','soDienThoai','emailCaNhan'] as const) {
            if(!updates[key] && previous[key]) updates[key]=previous[key];
          }
        }
        employees[index]={...employees[index],...updates,id:group.id,hoVaTen:updates.hoVaTen || employees[index].hoVaTen,
          extractionStatus:'success',extractionError:'',extractionDocumentKey:documentKey(group),aiVisionExtracted:reply.data.data.extractionMethod!=='ocr'};
        await publish(`Đã quét xong nhân viên ${index+1}/${options.groups.length}.`);break;
      }
      const message=reply.data?.error || reply.error || 'Không nhận được kết quả OCR.';
      employees[index]={...employees[index],extractionStatus:'failed',extractionError:message,cauHoiLamRo:[`OCR chưa hoàn thành: ${message}`]};
      const retryAfter=reply.data?.retryAfterSeconds || 0;
      if(!reply.data?.retryable || attempt===2 || retryAfter>30) {await publish(message);break;}
      const delay=Math.max(retryAfter*1000,2000*2**attempt+Math.round((options.random || Math.random)()*1000));
      await publish(`Nhân viên ${index+1}: chờ ${Math.ceil(delay/1000)} giây để thử lại…`);
      // Short waits allow the pause button to take effect promptly.
      for(let elapsed=0;elapsed<delay && !options.cancelled?.();elapsed+=250) await sleep(Math.min(250,delay-elapsed));
    }
  }
  employees=employees.map(employee=>employee.extractionStatus==='running' ? {...employee,extractionStatus:'waiting'} : employee);
  await publish('Đã giữ kết quả. Có thể tiếp tục Bước 2 hoặc thử lại hồ sơ chưa xong.');
  return employees;
}
