import type {OptimizedImageFile} from '../types';

export interface CropArea {x:number;y:number;width:number;height:number;}
export async function editDocumentImage(document:OptimizedImageFile,turns:number,crop?:CropArea):Promise<OptimizedImageFile> {
  if(!document.mimeType.startsWith('image/')) throw new Error('Chỉ xoay/cắt trực tiếp ảnh. PDF được OCR theo từng trang.');
  const img=new Image();
  await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('Không mở được ảnh.'));img.src=`data:${document.mimeType};base64,${document.base64Data}`;});
  const quarter=((turns%4)+4)%4;
  const canvas=window.document.createElement('canvas');
  canvas.width=quarter%2 ? img.naturalHeight : img.naturalWidth;
  canvas.height=quarter%2 ? img.naturalWidth : img.naturalHeight;
  const ctx=canvas.getContext('2d');if(!ctx) throw new Error('Trình duyệt không hỗ trợ chỉnh ảnh.');
  ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(quarter*Math.PI/2);ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);
  const out=window.document.createElement('canvas');
  const area=crop || {x:0,y:0,width:1,height:1};
  if(![area.x,area.y,area.width,area.height].every(Number.isFinite) || area.x<0 || area.y<0 || area.width<=0 || area.height<=0 || area.x+area.width>1.001 || area.y+area.height>1.001) throw new Error('Vùng cắt không hợp lệ.');
  const x=Math.round(area.x*canvas.width),y=Math.round(area.y*canvas.height);
  out.width=Math.min(canvas.width-x,Math.round(area.width*canvas.width));out.height=Math.min(canvas.height-y,Math.round(area.height*canvas.height));
  if(out.width<80 || out.height<80) throw new Error('Vùng cắt quá nhỏ. Hãy chọn đủ phần chữ cần đọc.');
  const output=out.getContext('2d');if(!output) throw new Error('Không tạo được ảnh đã chỉnh.');
  output.fillStyle='white';output.fillRect(0,0,out.width,out.height);output.drawImage(canvas,x,y,out.width,out.height,0,0,out.width,out.height);
  let dataUrl=out.toDataURL('image/jpeg',0.92);
  for(const quality of [0.84,0.76,0.68]) {if(dataUrl.length<3_900_000) break;dataUrl=out.toDataURL('image/jpeg',quality);}
  if(dataUrl.length>=3_900_000) throw new Error('Ảnh còn quá lớn. Hãy cắt sát vùng tài liệu hoặc chọn ảnh nhỏ hơn.');
  const base64Data=dataUrl.split(',')[1];
  const result={...document,id:crypto.randomUUID(),width:out.width,height:out.height,mimeType:'image/jpeg',dataUrl,base64Data,compressedSize:Math.floor(base64Data.length*3/4),ocrPages:undefined,extractedText:undefined};
  canvas.width=0;canvas.height=0;out.width=0;out.height=0;
  return result;
}
