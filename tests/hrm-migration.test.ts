import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planLegacyHrmImport} from '../backend/legacyHrmMigration.js';
const snapshot=()=>({employees:[{id:'e1',name:'TEST ONLY',email:'test@example.com',password:'DO_NOT_IMPORT',role:'admin'}],tasks:[{id:'t1',employeeId:'e1',assignedBy:'e1',title:'TEST TASK',description:'',dueDate:'2026-10-01',status:'completed',progress:100,resultNote:'TEST DONE',createdAt:'2026-09-01T00:00:00Z',updatedAt:'2026-09-02T00:00:00Z'}],mealData:{e1:{employeeId:'e1',records:{'2026-09-01':{date:'2026-09-01',mealsCount:1,sessions:[{mealType:'Bữa Trưa',startTime:'08:30',endTime:'17:30',location:'TEST LOCATION',purpose:'TEST PURPOSE',mealsCount:1}]}}}},settings:{mealPrice:40000}});
test('legacy migration is deterministic, strips passwords and never grants login roles',()=>{
  const source=snapshot(),first=planLegacyHrmImport(source),second=planLegacyHrmImport(source);
  assert.deepEqual(first,second);assert.deepEqual(first.counts,{hrm_directory:1,hrm_tasks:1,hrm_meals:1,hrm_settings:1});
  assert.equal(JSON.stringify(first).includes('DO_NOT_IMPORT'),false);
  const person=first.entries.find(e=>e.collection==='hrm_directory')!.record;
  assert.equal(person.accountId,'');assert.equal('role' in person,false);
  const task=first.entries.find(e=>e.collection==='hrm_tasks')!.record;
  assert.equal(task.employeeId,person.id);assert.equal(task.assignedBy,person.id);
  assert.equal(task.completedAt,source.tasks[0].updatedAt);assert.equal(task.updatedAt,source.tasks[0].updatedAt);
  assert.equal(first.entries.find(e=>e.collection==='hrm_meals')!.record.sessions[0].startTime,'08:30');
});
test('legacy migration rejects orphaned assignments, duplicate employees and mismatched meal totals',()=>{
  const orphan=snapshot();orphan.tasks[0].employeeId='missing';assert.throws(()=>planLegacyHrmImport(orphan));
  const duplicate=snapshot();duplicate.employees.push(duplicate.employees[0]);assert.throws(()=>planLegacyHrmImport(duplicate));
  const wrongCount=snapshot();wrongCount.mealData.e1.records['2026-09-01'].mealsCount=2;assert.throws(()=>planLegacyHrmImport(wrongCount));
});
test('explicit orphan preservation keeps historical work without granting account access',()=>{
  const source=snapshot();source.tasks[0].employeeId='removed-employee';
  const result=planLegacyHrmImport(source,{preserveOrphans:true});
  const profile=result.entries.find(e=>e.record.needsIdentityReview)!.record;
  assert.equal(profile.accountId,'');assert.equal(profile.email,'');assert.equal(profile.legacyId,'removed-employee');
  assert.equal(result.entries.find(e=>e.collection==='hrm_tasks')!.record.employeeId,profile.id);
});
