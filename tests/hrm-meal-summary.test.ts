import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SummaryTable} from '../src/modules/hrm/components/SummaryTable.js';
import {getCycleConfig} from '../src/modules/hrm/utils/cycleHelper.js';
import {HRM_SETTINGS} from '../backend/hrm.js';
test('personal statement counts two meals as one recruitment day and hides other staff',()=>{
 const html=renderToStaticMarkup(React.createElement(SummaryTable,{
  employees:[{id:'own',employeeCode:'9900003',name:'SELF ONLY',department:'HR'},{id:'other',name:'PRIVATE OTHER',department:'HR'}],
  mealData:{own:{employeeId:'own',records:{'2026-09-29':{date:'2026-09-29',mealsCount:2}}},other:{employeeId:'other',records:{'2026-09-29':{date:'2026-09-29',mealsCount:4}}}},
  cycle:getCycleConfig(2026,10),settings:HRM_SETTINGS,currentUser:{id:'own',employeeCode:'9900003',name:'SELF ONLY',role:'nhan_vien_nhan_su',department:'HR'},
  onViewEmployeeDetail:()=>{},onQuickCheckin:()=>{},onExportExcel:()=>{},
 }));
 const text=html.replace(/<[^>]*>/g,'');
 assert.match(text,/80\.000/);assert.match(text,/3% kỳ \(1\/30 ngày\)/);assert.match(text,/9900003/);assert.doesNotMatch(text,/PRIVATE OTHER/);assert.doesNotMatch(text,/Đã khóa/);
});
