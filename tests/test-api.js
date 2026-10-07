const http = require('http');
const app = require('../server');

let server;
const PORT = 3099;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const opt = {
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api${path}`,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body && !opt.headers['Content-Type']) {
      opt.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(opt, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusMessage, statusCode: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusMessage, statusCode: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'object' ? JSON.stringify(options.body) : options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' STARTING MCTEB SYSTEM AUTOMATED INTEGRATION TESTS ');
  console.log(' Municipality of Basco, Batanes                     ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  server = app.listen(PORT);
  await new Promise(r => setTimeout(r, 500));

  try {
    // 1. Metadata Test
    console.log('[1] Testing Metadata & Basco Barangays:');
    const metaRes = await request('/auth/metadata');
    assert(metaRes.statusCode === 200, 'Metadata returns 200 OK');
    assert(metaRes.data.barangays.length === 6, 'Contains 6 Basco Barangays');
    assert(metaRes.data.barangays.includes('Ihuvok II (Kayvaluganan)'), 'Includes Kayvaluganan');
    assert(metaRes.data.categories.length === 7, 'Contains all 7 Tool Categories');

    // 2. Admin Login
    console.log('\n[2] Testing Admin Authentication:');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@basco.gov.ph', password: 'Admin@123' }
    });
    assert(loginRes.statusCode === 200, 'Admin login returns 200 OK');
    assert(loginRes.data.user.role === 'Administrator', 'User role is Administrator');
    assert(loginRes.data.user.barangay === 'Ihuvok II (Kayvaluganan)', 'Admin barangay is verified');
    const adminCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';

    // 3. User Registration Test
    console.log('\n[3] Testing Resident Registration with Age Auto-calculation:');
    const testEmail = `test.resident.${Date.now()}@basco.gov.ph`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Maria',
        middleName: 'G.',
        lastName: 'Castillejos',
        birthday: '1995-05-15',
        contactNumber: '09191239876',
        barangay: 'San Antonio',
        houseNumber: '55',
        street: 'National Highway',
        email: testEmail,
        password: 'Password@123',
        role: 'Borrower'
      }
    });
    assert(regRes.statusCode === 201, 'Registration returns 201 Created');
    assert(regRes.data.user.age > 0, `Auto-calculated age is ${regRes.data.user.age}`);
    assert(regRes.data.user.userId.startsWith('USR-'), 'User ID is formatted USR-YYYY-XXXX');

    // 4. Tool Catalog Browse & Search
    console.log('\n[4] Testing Tool Catalog & Filtering:');
    const toolsRes = await request('/tools');
    assert(toolsRes.statusCode === 200, 'Tool catalog returns 200 OK');
    assert(toolsRes.data.tools.length >= 10, `Found ${toolsRes.data.tools.length} seeded tools in catalog`);

    const agriRes = await request('/tools?category=Agricultural+Tools');
    assert(agriRes.statusCode === 200, 'Agricultural category filter works');
    assert(agriRes.data.tools.every(t => t.category === 'Agricultural Tools'), 'All returned tools are Agricultural');

    // 5. Reservation Workflow
    console.log('\n[5] Testing Reservation Cycle (Create -> Staff Approve):');
    const borrowerLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'borrower@basco.gov.ph', password: 'User@123' }
    });
    const borrowerCookie = borrowerLogin.headers['set-cookie'] ? borrowerLogin.headers['set-cookie'][0] : '';
    
    const resCreate = await request('/reservations', {
      method: 'POST',
      headers: { Cookie: borrowerCookie },
      body: {
        toolId: 'TL-CRP-001',
        pickupDate: '2026-11-01',
        returnDate: '2026-11-03',
        purpose: 'House timber framing in Kayvaluganan'
      }
    });
    assert(resCreate.statusCode === 201, 'Reservation submitted successfully (201 Created)');
    const resId = resCreate.data.reservation.reservationId;

    // Staff approves reservation
    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'staff@basco.gov.ph', password: 'Staff@123' }
    });
    const staffCookie = staffLogin.headers['set-cookie'] ? staffLogin.headers['set-cookie'][0] : '';

    const approveRes = await request(`/reservations/${resId}/approve`, {
      method: 'PUT',
      headers: { Cookie: staffCookie },
      body: { staffNotes: 'Approved for carpentry project.' }
    });
    assert(approveRes.statusCode === 200, 'Staff approval succeeds with status 200');
    assert(approveRes.data.reservation.status === 'Approved', 'Reservation status updated to Approved');

    // 6. Payment & Official Electronic Receipt
    console.log('\n[6] Testing Payment & Official Electronic Receipt Generation:');
    const payRes = await request('/payments', {
      method: 'POST',
      headers: { Cookie: borrowerCookie },
      body: {
        reservationId: resId,
        toolId: 'TL-CRP-001',
        amount: 100.00,
        paymentMethod: 'GCash',
        referenceNumber: 'GCASH-TEST-998877',
        notes: '2 days advance rental fee'
      }
    });
    assert(payRes.statusCode === 201, 'Payment recorded successfully (201 Created)');
    const receiptId = payRes.data.payment.receiptId;
    assert(receiptId.startsWith('OR-'), `Official Electronic Receipt generated: ${receiptId}`);

    const oerRes = await request(`/payments/receipt/${receiptId}`, {
      headers: { Cookie: borrowerCookie }
    });
    assert(oerRes.statusCode === 200, 'Official Electronic Receipt fetched successfully');
    assert(oerRes.data.receipt.payer.name.includes('Juan'), 'Payer name correctly populated');
    assert(oerRes.data.receipt.municipality.NAME === 'Municipality of Basco', 'Municipality header verified');

    // 7. Equipment Checkout & Return Validation with Condition Assessment
    console.log('\n[7] Testing Equipment Checkout & Return Validation:');
    const checkoutRes = await request('/rentals/checkout', {
      method: 'POST',
      headers: { Cookie: staffCookie },
      body: {
        reservationId: resId,
        userId: 'USR-2026-0003',
        toolId: 'TL-CRP-001',
        dueDate: '2026-11-03',
        initialCondition: 'Good',
        notes: 'Equipment released in good running order'
      }
    });
    assert(checkoutRes.statusCode === 201, 'Equipment checkout completed (201 Created)');
    const rentalId = checkoutRes.data.rental.rentalId;

    // Return with condition check
    const returnRes = await request(`/rentals/${rentalId}/return`, {
      method: 'PUT',
      headers: { Cookie: staffCookie },
      body: {
        returnedCondition: 'Good',
        inspectionNotes: 'Saw returned clean with sharp blade',
        overduePenalty: 0,
        damagePenalty: 0
      }
    });
    assert(returnRes.statusCode === 200, 'Equipment return validated (200 OK)');
    assert(returnRes.data.rental.rentalStatus === 'Completed', 'Rental status marked Completed');

    // 8. Maintenance / Damage Workflow Test
    console.log('\n[8] Testing Damage Report & Maintenance Lifecycle:');
    const damageRes = await request('/maintenance/report', {
      method: 'POST',
      headers: { Cookie: staffCookie },
      body: {
        toolId: 'TL-MCH-001',
        severity: 'Moderate',
        issueDescription: 'Welding lead connection cable clamp loose.'
      }
    });
    assert(damageRes.statusCode === 201, 'Damage report logged (201 Created)');
    const ticketId = damageRes.data.ticket.maintenanceId;

    // Repair update to Completed
    const repairRes = await request(`/maintenance/${ticketId}`, {
      method: 'PUT',
      headers: { Cookie: staffCookie },
      body: {
        status: 'Completed',
        actualCost: 150.00,
        resolutionNotes: 'Clamp terminal replaced with heavy-duty brass connector.'
      }
    });
    assert(repairRes.statusCode === 200, 'Maintenance completed and tool restored to Available');

    // 9. Community Feedback
    console.log('\n[9] Testing Feedback & 5-Star Reviews:');
    const fdbRes = await request('/feedback', {
      method: 'POST',
      headers: { Cookie: borrowerCookie },
      body: {
        toolId: 'TL-CRP-001',
        rentalId: rentalId,
        rating: 5,
        toolConditionRating: 5,
        serviceRating: 5,
        comments: 'Excellent quality circular saw. Cut through hardwood smoothly!'
      }
    });
    assert(fdbRes.statusCode === 201, 'Community review submitted (201 Created)');

    // 10. Dashboard Stats & Analytics
    console.log('\n[10] Testing Dashboard Analytics & MySQL Export:');
    const dashRes = await request('/dashboard/stats', {
      headers: { Cookie: adminCookie }
    });
    assert(dashRes.statusCode === 200, 'Dashboard statistics returned 200 OK');
    assert(dashRes.data.stats.toolsCount >= 10, 'Total tools counted');
    assert(dashRes.data.stats.totalRevenue > 0, `Total rental revenue: ₱${dashRes.data.stats.totalRevenue}`);

    const sqlExportRes = await request('/dashboard/export?format=sql', {
      headers: { Cookie: adminCookie }
    });
    assert(sqlExportRes.statusCode === 200, 'MySQL migration SQL export generated successfully');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n====================================================');
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED `);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
