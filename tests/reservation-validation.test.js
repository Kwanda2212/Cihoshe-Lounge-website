const assert = require('node:assert/strict');
const { validateReservationRequest } = require('../server');

const cases = [
  { label: 'Tuesday lunch is allowed', date: '2026-09-01', time: '12:00', expected: true },
  { label: 'Sunday closing time is allowed', date: '2026-09-06', time: '22:00', expected: true },
  { label: 'Monday is rejected', date: '2026-08-31', time: '18:00', expected: false },
  { label: 'Before opening is rejected', date: '2026-09-02', time: '11:59', expected: false },
  { label: 'After closing is rejected', date: '2026-09-05', time: '22:01', expected: false }
];

for (const testCase of cases) {
  const result = validateReservationRequest(testCase.date, testCase.time);
  assert.equal(result.valid, testCase.expected, `${testCase.label}: expected ${testCase.expected} but got ${result.valid}`);
}

console.log('Reservation validation tests passed.');
