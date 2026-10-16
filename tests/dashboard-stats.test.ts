import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentMonthRange, dashboardReport, vietnamDay } from '../src/utils/dashboardStats.js';
import type { NhanSuRecord } from '../src/types.js';

const record = (timestamp:string,overrides:Partial<NhanSuRecord> = {}) => ({timestamp,userEmail:'recruiter-a@example.com',nguoiNhap:'Tuyển dụng A',khoi:'K',ban:'B',phong:'P',...overrides} as NhanSuRecord);
const now = new Date('2026-10-16T01:00:00Z');
test('OCR records count as digitized without mislabeling them as AI Vision',()=>{
  const report=dashboardReport([record('2026-10-16T01:00:00Z',{extractionMethod:'ocr',aiVisionExtracted:false})],'','',now);
  assert.equal(report.ai,1);assert.equal(report.unknownAI,0);assert.equal(report.people[0].ai,1);
});

test('inclusive Vietnam date boundaries apply equally to metrics and recruiter rows',() => {
  const records = [
    record('2026-09-30T16:59:59.999Z'),
    record('2026-09-30T17:00:00Z',{userEmail:' RECRUITER-A@EXAMPLE.COM ',aiVisionExtracted:true}),
    record('2026-10-31T16:59:59.999Z',{aiVisionExtracted:false}),
    record('2026-10-31T17:00:00Z'),
    record('2026-10-16T01:00:00Z',{userEmail:'recruiter-b@example.com',nguoiNhap:'Tuyển dụng B',ban:'B2',soTaiLieuDinhKem:3}),
  ];
  const report = dashboardReport(records,'2026-10-01','2026-10-31',now);
  assert.equal(report.total,3);
  assert.equal(report.ai,1);
  assert.equal(report.monthly,3);
  assert.equal(report.units,2,'identical room names in different departments are separate receiving units');
  assert.equal(report.unknownAI,1,'uploaded attachments are not evidence of successful AI extraction');
  assert.equal(report.people.length,2);
  assert.equal(report.people[0].total,2);
  assert.equal(report.people[0].ai,1);
  assert.equal(report.people[0].latest,'2026-10-31T16:59:59.999Z');
  assert.equal(report.people.reduce((sum,person) => sum+person.total,0),report.total);
  assert.equal(report.people.reduce((sum,person) => sum+person.monthly,0),report.monthly);
});

test('invalid, empty and open-ended ranges have predictable behavior',() => {
  const records = [record('2026-10-10T00:00:00Z'),record('invalid')];
  assert.equal(dashboardReport(records,'','',now).total,2);
  assert.equal(dashboardReport(records,'2026-10-01','',now).total,1);
  assert.equal(dashboardReport(records,'','2026-10-10',now).total,1);
  const reversed = dashboardReport(records,'2026-10-20','2026-10-10',now);
  assert.ok(reversed.error);
  assert.equal(reversed.total,0);
  assert.equal(reversed.people.length,0);
  assert.ok(dashboardReport(records,'2026-02-31','',now).error);
  assert.equal(dashboardReport([],'2026-10-01','2026-10-31',now).units,0);
  assert.equal(vietnamDay('invalid'),'');
});

test('current month is dynamic in Vietnam, including leap years and year boundaries',() => {
  assert.deepEqual(currentMonthRange(new Date('2024-02-15T00:00:00Z')),{from:'2024-02-01',to:'2024-02-29'});
  assert.deepEqual(currentMonthRange(new Date('2026-12-31T17:01:00Z')),{from:'2027-01-01',to:'2027-01-31'});
  const report = dashboardReport([record('2026-09-10T00:00:00Z')],'2026-09-01','2026-09-30',now);
  assert.equal(report.total,1);
  assert.equal(report.monthly,0,'the current-month card remains restricted to the chosen period');
});

test('missing account names fall back to email and unassigned units are excluded',() => {
  const report = dashboardReport([record('invalid',{nguoiNhap:'',khoi:'',ban:'',phong:''})],'','',now);
  assert.equal(report.people[0].name,'recruiter-a@example.com');
  assert.equal(report.people[0].latest,'');
  assert.equal(report.units,0);
});
