const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const requests = [];
const context = {
  FormData,
  URLSearchParams,
  console,
  fetch: async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({ success: true })
    };
  }
};

vm.runInNewContext(
  fs.readFileSync(require.resolve('../public/js/api.js'), 'utf8'),
  context,
  { filename: 'api.js' }
);
context.API = vm.runInNewContext('API', context);

async function runTests() {
  await context.API.submitPayment({
    reservationId: 'RES-1',
    toolId: 'TOOL-1',
    amount: 25,
    paymentMethod: 'GCash',
    referenceNumber: 'GCASH-123',
    notes: 'Test payment'
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/payments');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    reservationId: 'RES-1',
    toolId: 'TOOL-1',
    amount: 25,
    paymentMethod: 'GCash',
    referenceNumber: 'GCASH-123',
    notes: 'Test payment'
  });

  const formData = new FormData();
  formData.append('proofImage', new Blob(['proof']));
  await context.API.request('/payments', { method: 'POST', body: formData });
  assert.equal(requests[1].options.body, formData);
  assert.equal(requests[1].options.headers['Content-Type'], undefined);

  console.log('API client serialization tests passed.');
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
