const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function seed() {
  console.log('--- Seeding Basco MCTEB Database ---');

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
  const staffPasswordHash = await bcrypt.hash('Staff@123', salt);
  const userPasswordHash = await bcrypt.hash('User@123', salt);

  // 1. Users
  const users = [
    {
      userId: 'USR-2026-0001',
      firstName: 'Althea',
      middleName: 'Galaraga',
      lastName: 'Abad',
      birthday: '1988-04-12',
      age: 38,
      contactNumber: '09171234567',
      houseNumber: '102',
      street: 'Rizal Street',
      barangay: 'Ihuvok II (Kayvaluganan)',
      email: 'admin@basco.gov.ph',
      passwordHash: adminPasswordHash,
      role: 'Administrator',
      status: 'Active',
      avatar: '',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: '2026-01-10T08:00:00.000Z'
    },
    {
      userId: 'USR-2026-0002',
      firstName: 'Mateo',
      middleName: 'Castillejos',
      lastName: 'Valiente',
      birthday: '1992-08-25',
      age: 34,
      contactNumber: '09189876543',
      houseNumber: '45',
      street: 'Castillejos Blvd',
      barangay: 'Ihuvok I (Kaychanarianan)',
      email: 'staff@basco.gov.ph',
      passwordHash: staffPasswordHash,
      role: 'Municipal Staff',
      status: 'Active',
      avatar: '',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-01-15T09:30:00.000Z',
      updatedAt: '2026-01-15T09:30:00.000Z'
    },
    {
      userId: 'USR-2026-0003',
      firstName: 'Juan',
      middleName: 'Delos Santos',
      lastName: 'Dita',
      birthday: '1985-11-03',
      age: 40,
      contactNumber: '09205551234',
      houseNumber: '78',
      street: 'National Road',
      barangay: 'Ihuvok II (Kayvaluganan)',
      email: 'borrower@basco.gov.ph',
      passwordHash: userPasswordHash,
      role: 'Borrower',
      status: 'Active',
      avatar: '',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-01T10:00:00.000Z'
    },
    {
      userId: 'USR-2026-0004',
      firstName: 'Elena',
      middleName: 'Balasbas',
      lastName: 'Castillo',
      birthday: '1994-06-18',
      age: 32,
      contactNumber: '09998887766',
      houseNumber: '12',
      street: 'Chanarian Beachway',
      barangay: 'Chanarian',
      email: 'elena.castillo@basco.gov.ph',
      passwordHash: userPasswordHash,
      role: 'Borrower',
      status: 'Active',
      avatar: '',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: '2026-02-10T14:20:00.000Z',
      updatedAt: '2026-02-10T14:20:00.000Z'
    }
  ];

  // 2. Tools
  const tools = [
    {
      toolId: 'TL-AGR-001',
      toolName: 'Kubota 7HP Hand Tractor / Power Tiller',
      category: 'Agricultural Tools',
      description: 'Heavy-duty diesel walk-behind power tiller with rotary blade attachment for rice and garlic field tilling.',
      specifications: 'Engine: 7.0 HP 4-stroke Diesel | Tilling Width: 600mm | Fuel Capacity: 5.5L | Weight: 98kg',
      availabilityStatus: 'Available',
      equipmentCondition: 'Excellent',
      rentalFee: 150.00,
      depositFee: 300.00,
      quantityTotal: 3,
      quantityAvailable: 3,
      imagePath: '/images/tools/power-tiller.svg',
      serialNumber: 'KB-PT-2025-081',
      acquisitionDate: '2025-03-15',
      totalTimesBorrowed: 18,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-AGR-002',
      toolName: 'Stihl FS250 High-Output Brush Cutter',
      category: 'Agricultural Tools',
      description: 'Gasoline powered grass cutter and clearing saw suitable for hillside pasture clearing and farm weed control.',
      specifications: 'Displacement: 40.2cc | Power: 2.15 HP | Fuel Tank: 0.64L | Blade Type: 3-Tooth Steel & AutoCut',
      availabilityStatus: 'Available',
      equipmentCondition: 'Good',
      rentalFee: 60.00,
      depositFee: 100.00,
      quantityTotal: 5,
      quantityAvailable: 4,
      imagePath: '/images/tools/brush-cutter.svg',
      serialNumber: 'ST-BC-2025-104',
      acquisitionDate: '2025-04-10',
      totalTimesBorrowed: 42,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-FSH-001',
      toolName: 'Yamaha 15HP 4-Stroke Outboard Marine Motor',
      category: 'Fishing Equipment',
      description: 'Reliable marine outboard engine for local traditional tataya boats and municipal fishing expeditions.',
      specifications: 'Horsepower: 15 HP | Fuel Type: Unleaded Gasoline | Shaft Length: 15 inch (Short) | Weight: 45kg',
      availabilityStatus: 'Available',
      equipmentCondition: 'Excellent',
      rentalFee: 200.00,
      depositFee: 500.00,
      quantityTotal: 2,
      quantityAvailable: 2,
      imagePath: '/images/tools/outboard-motor.svg',
      serialNumber: 'YM-OBM-2025-012',
      acquisitionDate: '2025-05-20',
      totalTimesBorrowed: 14,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-FSH-002',
      toolName: 'Garmin Handheld Marine GPS & Fishfinder',
      category: 'Fishing Equipment',
      description: 'Waterproof high-sensitivity GPS navigator preloaded with Northern Luzon and Batanes coastal navigational waypoints.',
      specifications: 'Display: 2.6" 65K Color TFT | Battery Life: 16 Hours | Water Rating: IPX7 | Floating Capability',
      availabilityStatus: 'Available',
      equipmentCondition: 'Good',
      rentalFee: 80.00,
      depositFee: 200.00,
      quantityTotal: 4,
      quantityAvailable: 4,
      imagePath: '/images/tools/marine-gps.svg',
      serialNumber: 'GM-GPS-2025-044',
      acquisitionDate: '2025-06-01',
      totalTimesBorrowed: 29,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-CRP-001',
      toolName: 'Bosch Professional Circular Saw GKS 190',
      category: 'Carpentry Tools',
      description: 'High-speed circular wood saw for Ivatan stone house timber roofing, furniture making, and construction woodwork.',
      specifications: 'Power Input: 1,400W | Blade Diameter: 190mm | Max Cutting Depth: 70mm at 90° | No-load Speed: 5,500 RPM',
      availabilityStatus: 'Available',
      equipmentCondition: 'Good',
      rentalFee: 50.00,
      depositFee: 100.00,
      quantityTotal: 4,
      quantityAvailable: 3,
      imagePath: '/images/tools/circular-saw.svg',
      serialNumber: 'BS-CS-2025-009',
      acquisitionDate: '2025-02-14',
      totalTimesBorrowed: 31,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-CNS-001',
      toolName: 'Portable Electric Concrete Mixer (1-Bag)',
      category: 'Construction Tools',
      description: 'Heavy duty concrete mixer with durable cast iron ring gear and pneumatic transport wheels.',
      specifications: 'Capacity: 1 Bag Cement / 260L Drum | Motor: 2.0 HP Single Phase 220V | Rotation: 28-30 RPM',
      availabilityStatus: 'Available',
      equipmentCondition: 'Good',
      rentalFee: 180.00,
      depositFee: 400.00,
      quantityTotal: 2,
      quantityAvailable: 1,
      imagePath: '/images/tools/concrete-mixer.svg',
      serialNumber: 'CM-260-2025-003',
      acquisitionDate: '2025-01-20',
      totalTimesBorrowed: 22,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-ELC-001',
      toolName: 'Hydraulic Cable Lug Crimper (16-300mm²)',
      category: 'Electrical Tools',
      description: 'Industrial manual hydraulic crimping tool with interchangeable dies for high-amperage electrical wiring.',
      specifications: 'Crimping Range: 16-300mm² | Max Pressure: 12 Tons | Stroke: 20mm | Complete with steel case',
      availabilityStatus: 'Available',
      equipmentCondition: 'Excellent',
      rentalFee: 45.00,
      depositFee: 100.00,
      quantityTotal: 3,
      quantityAvailable: 3,
      imagePath: '/images/tools/cable-crimper.svg',
      serialNumber: 'HY-CR-2025-021',
      acquisitionDate: '2025-07-11',
      totalTimesBorrowed: 15,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-MCH-001',
      toolName: '200A Portable Inverter Arc / TIG Welder',
      category: 'Mechanical Tools',
      description: 'IGBT digital inverter welding machine capable of smooth stick welding for farm implements and steel gates.',
      specifications: 'Current Range: 20-200A | Duty Cycle: 60% @ 200A | Input: 220V Single Phase | Weight: 5.2kg',
      availabilityStatus: 'Available',
      equipmentCondition: 'Good',
      rentalFee: 90.00,
      depositFee: 200.00,
      quantityTotal: 4,
      quantityAvailable: 4,
      imagePath: '/images/tools/welding-machine.svg',
      serialNumber: 'WM-200-2025-015',
      acquisitionDate: '2025-03-30',
      totalTimesBorrowed: 27,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-EMG-001',
      toolName: '5.5kVA Silent Diesel Generator Standby Unit',
      category: 'Emergency Response Equipment',
      description: 'Sound-attenuated canopy diesel emergency power generator for typhoon preparedness and off-grid power.',
      specifications: 'Rated Output: 5.0 kVA | Max Output: 5.5 kVA | Voltage: 220V 60Hz | Fuel Tank: 15L (11hrs runtime)',
      availabilityStatus: 'Available',
      equipmentCondition: 'Excellent',
      rentalFee: 250.00,
      depositFee: 600.00,
      quantityTotal: 2,
      quantityAvailable: 2,
      imagePath: '/images/tools/diesel-generator.svg',
      serialNumber: 'GN-5500-2025-001',
      acquisitionDate: '2025-01-10',
      totalTimesBorrowed: 35,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    {
      toolId: 'TL-EMG-002',
      toolName: 'Stihl MS382 Heavy Rescue Chainsaw (25" Bar)',
      category: 'Emergency Response Equipment',
      description: 'High-power clearing chainsaw for clearing fallen trees, typhoon debris, and emergency road clearance.',
      specifications: 'Displacement: 72.2cc | Power: 5.3 HP | Guide Bar: 25 inches (63cm) | Weight: 6.2kg',
      availabilityStatus: 'Available',
      equipmentCondition: 'Good',
      rentalFee: 100.00,
      depositFee: 250.00,
      quantityTotal: 3,
      quantityAvailable: 3,
      imagePath: '/images/tools/chainsaw.svg',
      serialNumber: 'ST-CS-2025-033',
      acquisitionDate: '2025-02-18',
      totalTimesBorrowed: 49,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ];

  // 3. Reservations
  const reservations = [
    {
      reservationId: 'RES-2026-0001',
      userId: 'USR-2026-0003',
      toolId: 'TL-AGR-001',
      reservationDate: '2026-10-01T08:00:00.000Z',
      pickupDate: '2026-10-10',
      returnDate: '2026-10-12',
      purpose: 'Garlic farm land preparation in Brgy. Kayvaluganan',
      status: 'Approved',
      staffNotes: 'Approved for garlic planting season. Valid ID required upon pickup.',
      reviewedBy: 'USR-2026-0002',
      reviewedAt: '2026-10-02T09:15:00.000Z',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-02T09:15:00.000Z'
    },
    {
      reservationId: 'RES-2026-0002',
      userId: 'USR-2026-0004',
      toolId: 'TL-FSH-001',
      reservationDate: '2026-10-05T11:20:00.000Z',
      pickupDate: '2026-10-15',
      returnDate: '2026-10-17',
      purpose: 'Community cooperative coastal fishing expedition',
      status: 'Pending',
      staffNotes: '',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: '2026-10-05T11:20:00.000Z',
      updatedAt: '2026-10-05T11:20:00.000Z'
    }
  ];

  // 4. Rentals
  const rentals = [
    {
      rentalId: 'RNT-2026-0001',
      reservationId: 'RES-2026-0001',
      userId: 'USR-2026-0003',
      toolId: 'TL-AGR-002',
      rentalDate: '2026-09-20T08:30:00.000Z',
      dueDate: '2026-09-22',
      actualReturnDate: '2026-09-22T16:00:00.000Z',
      rentalStatus: 'Completed',
      initialCondition: 'Good',
      returnedCondition: 'Good',
      releasedBy: 'USR-2026-0002',
      receivedBy: 'USR-2026-0002',
      inspectionNotes: 'Returned clean with full fuel tank. Blade in good shape.',
      overduePenalty: 0,
      damagePenalty: 0,
      createdAt: '2026-09-20T08:30:00.000Z',
      updatedAt: '2026-09-22T16:00:00.000Z'
    }
  ];

  // 5. Payments
  const payments = [
    {
      paymentId: 'PAY-2026-0001',
      receiptId: 'OR-2026-894210',
      userId: 'USR-2026-0003',
      reservationId: 'RES-2026-0001',
      rentalId: 'RNT-2026-0001',
      toolId: 'TL-AGR-002',
      amount: 120.00,
      referenceNumber: 'GCASH-9823148190',
      paymentMethod: 'GCash',
      paymentDate: '2026-09-20T08:25:00.000Z',
      paymentStatus: 'Paid',
      proofImage: '',
      verifiedBy: 'USR-2026-0002',
      verifiedAt: '2026-09-20T08:30:00.000Z',
      notes: 'Paid via GCash - 2 days rental',
      createdAt: '2026-09-20T08:25:00.000Z',
      updatedAt: '2026-09-20T08:30:00.000Z'
    },
    {
      paymentId: 'PAY-2026-0002',
      receiptId: 'OR-2026-451208',
      userId: 'USR-2026-0003',
      reservationId: 'RES-2026-0001',
      rentalId: null,
      toolId: 'TL-AGR-001',
      amount: 300.00,
      referenceNumber: 'MAYA-4412895123',
      paymentMethod: 'Maya',
      paymentDate: '2026-10-02T10:00:00.000Z',
      paymentStatus: 'Paid',
      proofImage: '',
      verifiedBy: 'USR-2026-0002',
      verifiedAt: '2026-10-02T10:10:00.000Z',
      notes: 'Advance rental fee for garlic cultivation',
      createdAt: '2026-10-02T10:00:00.000Z',
      updatedAt: '2026-10-02T10:10:00.000Z'
    }
  ];

  // 6. Maintenance
  const maintenance = [
    {
      maintenanceId: 'MNT-2026-0001',
      toolId: 'TL-CNS-001',
      reportedBy: 'USR-2026-0002',
      rentalId: null,
      issueDescription: 'Routine preventive lubrication of gear mechanism and drum bearing inspection.',
      severity: 'Minor',
      status: 'Completed',
      assignedTechnician: 'Basco Municipal Motorpool',
      estimatedCost: 250.00,
      actualCost: 200.00,
      scheduledDate: '2026-09-10',
      completedDate: '2026-09-11',
      resolutionNotes: 'Bearings greased, drive belt tension adjusted to factory spec.',
      createdAt: '2026-09-09T08:00:00.000Z',
      updatedAt: '2026-09-11T16:00:00.000Z'
    }
  ];

  // 7. Feedback
  const feedback = [
    {
      feedbackId: 'FDB-2026-0001',
      rentalId: 'RNT-2026-0001',
      toolId: 'TL-AGR-002',
      userId: 'USR-2026-0003',
      userName: 'Juan Dita',
      rating: 5,
      toolConditionRating: 5,
      serviceRating: 5,
      comments: 'Napaka-ayos gamitin ng brush cutter. Mabilis natapos ang paglinis ng bukid. Salamat sa Basco LGU!',
      isPublic: true,
      createdAt: '2026-09-22T17:00:00.000Z',
      updatedAt: '2026-09-22T17:00:00.000Z'
    },
    {
      feedbackId: 'FDB-2026-0002',
      rentalId: null,
      toolId: 'TL-AGR-001',
      userId: 'USR-2026-0004',
      userName: 'Elena Castillo',
      rating: 5,
      toolConditionRating: 5,
      serviceRating: 5,
      comments: 'Very powerful Kubota tiller. Saved us 3 full days of manual plowing.',
      isPublic: true,
      createdAt: '2026-09-28T14:30:00.000Z',
      updatedAt: '2026-09-28T14:30:00.000Z'
    }
  ];

  // 8. Notifications
  const notifications = [
    {
      notificationId: 'NOTIF-00001',
      userId: 'USR-2026-0003',
      title: 'Reservation Approved!',
      message: 'Your reservation for "Kubota 7HP Hand Tractor" (RES-2026-0001) has been approved. Pickup date is Oct 10, 2026.',
      type: 'success',
      link: '/reservations?id=RES-2026-0001',
      isRead: false,
      createdAt: '2026-10-02T09:15:00.000Z',
      updatedAt: '2026-10-02T09:15:00.000Z'
    },
    {
      notificationId: 'NOTIF-00002',
      userId: 'USR-2026-0003',
      title: 'Official Electronic Receipt Generated',
      message: 'Official Receipt OR-2026-451208 has been issued for your reservation payment of ₱300.00.',
      type: 'info',
      link: '/receipts/OR-2026-451208',
      isRead: true,
      createdAt: '2026-10-02T10:10:00.000Z',
      updatedAt: '2026-10-02T10:10:00.000Z'
    }
  ];

  // 9. Audit Logs
  const audit_logs = [
    {
      logId: 'AUD-00001',
      userId: 'USR-2026-0001',
      userName: 'Althea Abad',
      action: 'SYSTEM_INIT',
      targetType: 'System',
      targetId: 'MCTEB-BASCO',
      details: 'MCTEB System initialized for Municipality of Basco, Batanes',
      ipAddress: '127.0.0.1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  ];

  // Write all json files
  const tables = {
    users,
    tools,
    reservations,
    rentals,
    payments,
    receipts: [],
    maintenance,
    feedback,
    notifications,
    audit_logs
  };

  for (const [table, data] of Object.entries(tables)) {
    const filePath = path.join(DATA_DIR, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ Seeded ${table}.json (${data.length} records)`);
  }

  console.log('--- Seeding Completed Successfully ---');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
