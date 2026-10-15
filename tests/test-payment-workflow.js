const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcteb-payment-test-'));
process.env.DB_DATA_DIR = dataDir;

const toolRepository = require('../server/repositories/toolRepository');
const paymentRepository = require('../server/repositories/paymentRepository');
const paymentController = require('../server/controllers/paymentController');

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

async function runTests() {
  try {
    await toolRepository.create({
      toolId: 'TL-TEST-001',
      toolName: 'Test Equipment',
      category: 'Construction Tools',
      rentalFee: 25
    });

    const req = {
      body: {
        reservationId: 'RES-TEST-001',
        toolId: 'TL-TEST-001',
        amount: 50,
        paymentMethod: 'GCash',
        referenceNumber: 'GCASH-TEST-001',
        notes: 'Payment workflow test'
      },
      user: { userId: 'USR-TEST-001', role: 'Borrower' },
      file: undefined,
      ip: '127.0.0.1'
    };
    const res = makeResponse();

    await paymentController.submitPayment(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.payment.amount, 50);
    assert.equal(res.body.payment.toolId, 'TL-TEST-001');
    assert.ok(res.body.payment.receiptId.startsWith('OR-'));

    const savedPayments = JSON.parse(fs.readFileSync(path.join(dataDir, 'payments.json'), 'utf8'));
    const savedNotifications = JSON.parse(fs.readFileSync(path.join(dataDir, 'notifications.json'), 'utf8'));
    const savedAudit = JSON.parse(fs.readFileSync(path.join(dataDir, 'audit_logs.json'), 'utf8'));

    assert.equal(savedPayments.length, 1);
    assert.equal(savedPayments[0].paymentId, res.body.payment.paymentId);
    assert.equal(savedNotifications.length, 1);
    assert.equal(savedAudit.length, 1);

    const invalidAmountResponse = makeResponse();
    await paymentController.submitPayment({
      ...req,
      body: { ...req.body, amount: 'not-a-number' }
    }, invalidAmountResponse);
    assert.equal(invalidAmountResponse.statusCode, 400);
    const paymentsAfterInvalidSubmission = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'payments.json'), 'utf8')
    );
    assert.equal(paymentsAfterInvalidSubmission.length, 1);

    const missingToolResponse = makeResponse();
    await paymentController.submitPayment({
      ...req,
      body: { ...req.body, toolId: 'TL-MISSING-001' }
    }, missingToolResponse);
    assert.equal(missingToolResponse.statusCode, 404);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'payments.json'), 'utf8')).length, 1);

    console.log('Payment controller persistence tests passed.');
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
