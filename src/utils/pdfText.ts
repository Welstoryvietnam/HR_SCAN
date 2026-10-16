// PDF text is supplemental: always keep the original PDF for tables, scans and
// pages with mixed text/images so household relationships are not lost.
export async function readPDFText(file:File):Promise<string|undefined> {
  try {
    const pdfjs=await import('pdfjs-dist');
    const {default:workerUrl}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
    const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
    const pdf=await task.promise;
    try {
      if(pdf.numPages>30) return undefined;
      const pages:string[]=[];
      for(let index=1;index<=pdf.numPages;index++) {
        const page=await pdf.getPage(index);
        const content=await page.getTextContent();
        const text=content.items.map(item=>'str' in item ? item.str+('hasEOL' in item && item.hasEOL ? '\n' : ' ') : '').join('');
        pages.push(`Trang ${index}:\n${text}`);
        if(pages.join('').length>60_000) return undefined;
      }
      const text=pages.join('\n\n');
      return text.replace(/\s/g,'').length>80 ? text : undefined;
    } finally {await task.destroy();}
  } catch {return undefined;}
}
