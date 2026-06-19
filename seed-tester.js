import { db, client } from './src/config/database.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seedTester() {
  console.log('🏁 Starting seeder script for App Store Tester...');
  
  try {
    const email = 'podorukuntester@gmail.com';
    const password = 'tester123#';
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 1. Get or Create Company
    let companyId;
    const companyRes = await db.execute(sql`SELECT id FROM companies LIMIT 1;`);
    if (companyRes.length > 0) {
      companyId = companyRes[0].id;
      console.log(`🏢 Reusing existing company with ID: ${companyId}`);
    } else {
      const newCompany = await db.execute(sql`
        INSERT INTO companies (nama_pt, kode_pt, alamat, theme_color)
        VALUES ('PodoRukun Group Tester', 'PRGT', 'Jl. Tester No. 1', '#4f46e5')
        RETURNING id;
      `);
      companyId = newCompany[0].id;
      console.log(`🏢 Created new company with ID: ${companyId}`);
    }

    // 2. Create/Update Tester User
    let userId;
    const userRes = await db.execute(sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email});`);
    if (userRes.length > 0) {
      userId = userRes[0].id;
      await db.execute(sql`
        UPDATE users
        SET password_hash = ${passwordHash}, status = 'active', role = 'customer'
        WHERE id = ${userId};
      `);
      console.log(`👤 Updated existing user (${email}) with password: ${password}`);
    } else {
      const newUser = await db.execute(sql`
        INSERT INTO users (company_id, nama, email, password_hash, nomor_telepon, role, status)
        VALUES (${companyId}, 'App Store Reviewer', ${email}, ${passwordHash}, '08123456789', 'customer', 'active')
        RETURNING id;
      `);
      userId = newUser[0].id;
      console.log(`👤 Created new tester user (${email}) with password: ${password}`);
    }

    // 3. Create Project
    const newProject = await db.execute(sql`
      INSERT INTO projects (company_id, nama_proyek, lokasi, deskripsi, status)
      VALUES (${companyId}, 'Grand PodoRukun Residence', 'Kota Tester', 'Proyek perumahan tester untuk simulasi App Store review', 'active')
      RETURNING id;
    `);
    const projectId = newProject[0].id;
    console.log(`🏗️ Created new project with ID: ${projectId}`);

    // 4. Create Cluster
    const newCluster = await db.execute(sql`
      INSERT INTO clusters (project_id, nama_cluster, jumlah_unit)
      VALUES (${projectId}, 'Cluster Clover', 1)
      RETURNING id;
    `);
    const clusterId = newCluster[0].id;
    console.log(`🏡 Created new cluster with ID: ${clusterId}`);

    // 5. Create Unit
    const newUnit = await db.execute(sql`
      INSERT INTO units (cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, image_url)
      VALUES (${clusterId}, 'A-01', 'Tipe 45/90', 90, 45, 'dalam_pembangunan', 65, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800')
      RETURNING id;
    `);
    const unitId = newUnit[0].id;
    console.log(`🏠 Created new unit with ID: ${unitId}`);

    // 6. Create Property Assignment
    const newAssignment = await db.execute(sql`
      INSERT INTO property_assignments (user_id, unit_id, tipe_pembayaran, harga_total, total_dibayar, tenor_bulan, status_kepemilikan)
      VALUES (${userId}, ${unitId}, 'cash_cicil', 450000000, 225000000, 12, 'active')
      RETURNING id;
    `);
    const assignmentId = newAssignment[0].id;
    console.log(`📝 Created property assignment with ID: ${assignmentId}`);

    // 7. Seed Construction Timelines
    const stages = [
      { name: 'Pondasi', start: '2026-05-01', end: '2026-05-20', status: 'completed' },
      { name: 'Struktur Dinding', start: '2026-05-21', end: '2026-06-15', status: 'completed' },
      { name: 'Atap & Genteng', start: '2026-06-16', end: '2026-07-10', status: 'ongoing' },
      { name: 'Finishing & Cat', start: '2026-07-11', end: '2026-08-05', status: 'planned' }
    ];
    for (const s of stages) {
      await db.execute(sql`
        INSERT INTO timelines (company_id, project_id, unit_id, task_name, start_date, end_date, status)
        VALUES (${companyId}, ${projectId}, ${unitId}, ${s.name}, ${s.start}::timestamp, ${s.end}::timestamp, ${s.status});
      `);
    }
    console.log('📅 Seeded construction timelines');

    // 8. Seed Progress & Documentation
    const progressPondasi = await db.execute(sql`
      INSERT INTO progress (unit_id, tahap, progress_percentage, tanggal_update, catatan)
      VALUES (${unitId}, 'Pondasi', 100, '2026-05-20', 'Pondasi cakar ayam selesai 100%')
      RETURNING id;
    `);
    
    const progressDinding = await db.execute(sql`
      INSERT INTO progress (unit_id, tahap, progress_percentage, tanggal_update, catatan)
      VALUES (${unitId}, 'Struktur Dinding', 100, '2026-06-15', 'Pemasangan dinding bata merah dan plesteran selesai')
      RETURNING id;
    `);

    await db.execute(sql`
      INSERT INTO progress (unit_id, tahap, progress_percentage, tanggal_update, catatan)
      VALUES (${unitId}, 'Atap & Genteng', 45, '2026-06-19', 'Rangka atap baja ringan terpasang, sedang pemasangan genteng')
      RETURNING id;
    `);

    // Add Documentation image
    await db.execute(sql`
      INSERT INTO documentation (unit_id, progress_id, jenis, url, nama_file, ukuran_bytes)
      VALUES (
        ${unitId}, 
        ${progressDinding[0].id}, 
        'foto', 
        'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800', 
        'progres_dinding.jpg', 
        204800
      );
    `);
    console.log('📸 Seeded progress and documentation');

    // 9. Seed Payment History
    await db.execute(sql`
      INSERT INTO payment_history (assignment_id, jumlah_bayar, tanggal_bayar, catatan)
      VALUES (${assignmentId}, 112500000, '2026-05-05', 'Uang Muka / Down Payment');
    `);
    await db.execute(sql`
      INSERT INTO payment_history (assignment_id, jumlah_bayar, tanggal_bayar, catatan)
      VALUES (${assignmentId}, 56250000, '2026-06-05', 'Cicilan ke-1');
    `);
    await db.execute(sql`
      INSERT INTO payment_history (assignment_id, jumlah_bayar, tanggal_bayar, catatan)
      VALUES (${assignmentId}, 56250000, '2026-06-19', 'Cicilan ke-2');
    `);
    console.log('💳 Seeded payment history');

    console.log('🎉 Seeding successfully completed!');
    console.log(`✅ Demo Account Email: ${email}`);
    console.log(`✅ Demo Account Password: ${password}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

seedTester();
