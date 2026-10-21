import {describe,it,expect} from 'vitest';
import {createPaymentSchema} from '../src/modules/assignments/assignment.schema.js';
const params={id:'00000000-0000-4000-8000-000000000001'};
const bill={si_jadwal_id:'00000000-0000-4000-8000-000000000002',request_id:'00000000-0000-4000-8000-000000000003',tanggal_bayar:'2026-10-19',rekening_tujuan:'123456',bukti_pembayaran:['https://evidence.example.test/a.jpg']};
describe('billing capture request contract',()=>{
 it('accepts a bill reference without a client supplied nominal and preserves its request key',()=>{
  expect(createPaymentSchema.params.safeParse(params).success).toBe(true);
  expect(createPaymentSchema.body.parse(bill)).toEqual(bill);
 });
 it('rejects missing identifiers/evidence and ambiguous actual dates',()=>{
  for(const b of [{...bill,request_id:undefined},{...bill,bukti_pembayaran:[]},{...bill,tanggal_bayar:'2026-02-30'},{...bill,tanggal_bayar:'2026-10-19T01:00:00Z'},{...bill,rekening_tujuan:undefined}]) expect(createPaymentSchema.body.safeParse(b).success).toBe(false);
 });
 it('preserves the legacy nominal contract until billing mode is activated',()=>{
  expect(createPaymentSchema.body.parse({jumlah_bayar:-100})).toEqual({jumlah_bayar:-100});
  expect(createPaymentSchema.body.safeParse({}).success).toBe(false);
 });
});
