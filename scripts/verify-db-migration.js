/**
 * Verifikasi Migrasi Database
 *
 * Membandingkan database lama (sumber) dengan database baru (tujuan) dan
 * melaporkan apakah keduanya identik. Dijalankan setelah restore selesai dan
 * SEBELUM DATABASE_URL runtime dialihkan.
 *
 * Yang diperiksa:
 *   1. Kesehatan  — konektivitas, versi server, latensi, kuota koneksi
 *   2. Struktur   — daftar tabel, kolom, dan tipe datanya
 *   3. Isi        — jumlah baris dan checksum konten per tabel
 *   4. Sequence   — nilai terakhir tiap sequence
 *
 * Kedua URL harus memakai session pooler atau direct connection. Lewat
 * transaction pooler, checksum bisa berbeda-beda antar pemanggilan karena
 * pengaturan sesi (DateStyle, timezone) tidak bertahan antar statement.
 *
 * Penggunaan:
 *   SOURCE_DATABASE_URL=postgres://... TARGET_DATABASE_URL=postgres://... \
 *     node scripts/verify-db-migration.js
 *
 * Keluar dengan kode 0 bila identik, 1 bila ada perbedaan atau kegagalan.
 */
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_URL || !TARGET_URL) {
  console.error('❌ SOURCE_DATABASE_URL dan TARGET_DATABASE_URL wajib diisi.');
  console.error('   Contoh:');
  console.error('     SOURCE_DATABASE_URL="postgres://..." \\');
  console.error('     TARGET_DATABASE_URL="postgres://..." \\');
  console.error('     node scripts/verify-db-migration.js');
  process.exit(1);
}

// Satu koneksi saja per database: skrip ini berjalan berurutan, dan selama
// jendela pemeliharaan kuota koneksi sebaiknya disisakan untuk pg_restore.
const connect = (url) =>
  postgres(url, { max: 1, prepare: false, connect_timeout: 15, idle_timeout: 20 });

/**
 * Menyeragamkan pengaturan sesi yang memengaruhi representasi teks sebuah baris.
 * Tanpa ini, dua server dengan locale atau versi berbeda menghasilkan checksum
 * berbeda untuk data yang sebenarnya sama — timestamp, angka pecahan, dan
 * interval semuanya sensitif terhadap pengaturan ini.
 *
 * Dipasang sebagai SET LOCAL di dalam transaksi, bukan SET biasa, agar tetap
 * berlaku walau koneksi melewati pooler.
 */
async function withStableSession(sql, fn) {
  return sql.begin(async (tx) => {
    await tx`SET LOCAL search_path = public`;
    await tx`SET LOCAL DateStyle = 'ISO, YMD'`;
    await tx`SET LOCAL TimeZone = 'UTC'`;
    await tx`SET LOCAL extra_float_digits = 3`;
    return fn(tx);
  });
}

async function getHealth(sql, label) {
  const started = Date.now();
  const [info] = await sql`
    SELECT current_database()                        AS database,
           version()                                 AS version,
           current_setting('server_version_num')     AS version_num,
           current_setting('max_connections')        AS max_connections,
           pg_size_pretty(pg_database_size(current_database())) AS size
  `;
  const latencyMs = Date.now() - started;

  const [{ active }] = await sql`
    SELECT count(*)::int AS active FROM pg_stat_activity WHERE datname = current_database()
  `;

  // gen_random_uuid() dipakai sebagai DEFAULT hampir semua primary key di
  // skema ini. Bawaan PostgreSQL sejak versi 13; di bawah itu perlu pgcrypto.
  let uuidOk = true;
  try {
    await sql`SELECT gen_random_uuid()`;
  } catch {
    uuidOk = false;
  }

  return { label, latencyMs, uuidOk, active, ...info };
}

async function getColumns(sql) {
  return withStableSession(sql, (tx) => tx`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, column_name
  `);
}

async function getTables(sql) {
  const rows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return rows.map((r) => r.table_name);
}

/**
 * Checksum isi tabel. Tiap baris dicetak sebagai teks lalu diurutkan menurut
 * teks itu sendiri — bukan menurut primary key — supaya urutan fisik baris
 * (yang selalu berubah setelah restore) tidak memengaruhi hasil.
 */
async function getTableDigest(sql, tableName) {
  const [row] = await withStableSession(sql, (tx) => tx`
    SELECT count(*)::bigint AS row_count,
           COALESCE(md5(string_agg(row_text, E'\n' ORDER BY row_text)), 'kosong') AS checksum
    FROM (SELECT t::text AS row_text FROM ${tx(tableName)} t) s
  `);
  return { rowCount: Number(row.row_count), checksum: row.checksum };
}

async function getSequences(sql) {
  return sql`
    SELECT schemaname || '.' || sequencename AS name, last_value
    FROM pg_sequences
    WHERE schemaname = 'public'
    ORDER BY name
  `;
}

function reportHealth(health) {
  console.log(`\n  ${health.label}`);
  console.log(`    Database        : ${health.database}`);
  console.log(`    Versi server    : ${health.version.split(' ').slice(0, 2).join(' ')} (${health.version_num})`);
  console.log(`    Ukuran          : ${health.size}`);
  console.log(`    Koneksi aktif   : ${health.active} (max_connections server: ${health.max_connections})`);
  console.log(`    Latensi query   : ${health.latencyMs} ms`);
  console.log(`    gen_random_uuid : ${health.uuidOk ? 'tersedia' : 'TIDAK TERSEDIA'}`);
}

async function main() {
  const problems = [];
  let source;
  let target;

  console.log('🔌 Langkah 1: Kesehatan dan konektivitas');

  try {
    source = connect(SOURCE_URL);
    const sourceHealth = await getHealth(source, 'SUMBER (database lama)');
    reportHealth(sourceHealth);

    target = connect(TARGET_URL);
    const targetHealth = await getHealth(target, 'TUJUAN (database baru)');
    reportHealth(targetHealth);

    if (!targetHealth.uuidOk) {
      problems.push(
        'Database tujuan tidak mengenal gen_random_uuid(). Versi PostgreSQL di ' +
        'bawah 13, atau ekstensi pgcrypto belum aktif. Semua INSERT akan gagal.'
      );
    }

    const sourceMajor = Math.floor(Number(sourceHealth.version_num) / 10000);
    const targetMajor = Math.floor(Number(targetHealth.version_num) / 10000);
    if (targetMajor < sourceMajor) {
      problems.push(
        `Database tujuan (PostgreSQL ${targetMajor}) lebih lama dari sumber ` +
        `(PostgreSQL ${sourceMajor}). Dump dari versi lebih baru bisa memakai ` +
        'sintaks yang tidak dikenali.'
      );
    }
  } catch (error) {
    console.error(`\n❌ Gagal terhubung: ${error.message}`);
    await source?.end();
    await target?.end();
    process.exit(1);
  }

  try {
    console.log('\n🧱 Langkah 2: Struktur tabel dan kolom');

    const [sourceTables, targetTables] = await Promise.all([
      getTables(source),
      getTables(target),
    ]);

    const missing = sourceTables.filter((t) => !targetTables.includes(t));
    const extra = targetTables.filter((t) => !sourceTables.includes(t));

    console.log(`    Tabel di sumber : ${sourceTables.length}`);
    console.log(`    Tabel di tujuan : ${targetTables.length}`);

    if (missing.length) {
      problems.push(`Tabel hilang di tujuan: ${missing.join(', ')}`);
      console.log(`    ❌ Hilang di tujuan: ${missing.join(', ')}`);
    }
    if (extra.length) {
      // Bukan kegagalan: tabel tambahan tidak merusak apa pun, tapi biasanya
      // menandakan restore dilakukan ke database yang sudah berisi sesuatu.
      console.log(`    ⚠️  Hanya ada di tujuan: ${extra.join(', ')}`);
    }
    if (!missing.length && !extra.length) {
      console.log('    ✅ Daftar tabel sama persis');
    }

    const [sourceColumns, targetColumns] = await Promise.all([
      getColumns(source),
      getColumns(target),
    ]);

    const columnKey = (c) =>
      `${c.table_name}.${c.column_name} ${c.data_type} ${c.is_nullable} ${c.column_default ?? '-'}`;
    const sourceColumnSet = new Set(sourceColumns.map(columnKey));
    const targetColumnSet = new Set(targetColumns.map(columnKey));
    const columnDiff = [
      ...[...sourceColumnSet].filter((c) => !targetColumnSet.has(c)).map((c) => `- ${c}`),
      ...[...targetColumnSet].filter((c) => !sourceColumnSet.has(c)).map((c) => `+ ${c}`),
    ];

    if (columnDiff.length) {
      problems.push(`${columnDiff.length} definisi kolom berbeda`);
      console.log('    ❌ Perbedaan definisi kolom:');
      columnDiff.slice(0, 30).forEach((d) => console.log(`       ${d}`));
      if (columnDiff.length > 30) {
        console.log(`       ... dan ${columnDiff.length - 30} lainnya`);
      }
    } else {
      console.log(`    ✅ ${sourceColumns.length} definisi kolom sama persis`);
    }

    console.log('\n🔢 Langkah 3: Jumlah baris dan checksum isi per tabel');

    const comparable = sourceTables.filter((t) => targetTables.includes(t));
    let identical = 0;
    let totalRows = 0;

    for (const table of comparable) {
      const [a, b] = await Promise.all([
        getTableDigest(source, table),
        getTableDigest(target, table),
      ]);
      totalRows += a.rowCount;

      if (a.rowCount !== b.rowCount) {
        problems.push(`${table}: ${a.rowCount} baris di sumber, ${b.rowCount} di tujuan`);
        console.log(`    ❌ ${table.padEnd(28)} ${a.rowCount} → ${b.rowCount} baris`);
      } else if (a.checksum !== b.checksum) {
        // Jumlah baris sama tapi isinya berbeda — biasanya pemotongan presisi
        // timestamp, perbedaan encoding teks, atau kolom yang tidak ikut ter-restore.
        problems.push(`${table}: jumlah baris sama (${a.rowCount}) tapi isinya berbeda`);
        console.log(`    ❌ ${table.padEnd(28)} ${a.rowCount} baris, checksum beda`);
      } else {
        identical += 1;
        console.log(`    ✅ ${table.padEnd(28)} ${a.rowCount} baris, checksum cocok`);
      }
    }

    console.log(`\n    ${identical}/${comparable.length} tabel identik, total ${totalRows} baris di sumber`);

    console.log('\n🔁 Langkah 4: Sequence');

    const [sourceSeq, targetSeq] = await Promise.all([
      getSequences(source),
      getSequences(target),
    ]);

    if (!sourceSeq.length) {
      console.log('    ℹ️  Tidak ada sequence di skema public (primary key memakai UUID)');
    } else {
      const targetSeqMap = new Map(targetSeq.map((s) => [s.name, s.last_value]));
      for (const seq of sourceSeq) {
        const targetValue = targetSeqMap.get(seq.name);
        if (targetValue === undefined) {
          problems.push(`Sequence ${seq.name} tidak ada di tujuan`);
          console.log(`    ❌ ${seq.name.padEnd(40)} tidak ada di tujuan`);
        } else if (String(targetValue) !== String(seq.last_value)) {
          // Restore --data-only tidak selalu memajukan sequence. Bila dibiarkan,
          // INSERT berikutnya memakai nilai yang sudah terpakai dan menabrak
          // primary key.
          problems.push(
            `Sequence ${seq.name}: sumber ${seq.last_value}, tujuan ${targetValue}. ` +
            'Jalankan setval() sebelum menerima trafik.'
          );
          console.log(`    ❌ ${seq.name.padEnd(40)} ${seq.last_value} → ${targetValue}`);
        } else {
          console.log(`    ✅ ${seq.name.padEnd(40)} ${seq.last_value}`);
        }
      }
    }
  } catch (error) {
    console.error(`\n❌ Verifikasi gagal di tengah jalan: ${error.message}`);
    problems.push(`Verifikasi tidak selesai: ${error.message}`);
  } finally {
    await source.end();
    await target.end();
  }

  console.log(`\n${'─'.repeat(64)}`);
  if (problems.length === 0) {
    console.log('🎉 Kedua database identik. Aman untuk mengalihkan DATABASE_URL.');
    process.exit(0);
  }

  console.log(`⛔ Ditemukan ${problems.length} masalah — JANGAN alihkan DATABASE_URL:\n`);
  problems.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
  console.log('\n   Perbaiki dulu, lalu jalankan ulang skrip ini.');
  process.exit(1);
}

main();
