import { Client } from 'pg';

async function updateEnums() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'lead_sales',
    user: 'postgres',
    password: 'ULTS@13032003',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const statements = [
      "ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Legal Review'",
      "ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Delivery Review'",
      "ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Procurement Review'",
      "ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Finance Review'",
      "ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'Client Review'",
      "ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'CEO Approval'",
      "ALTER TYPE agreement_stage_history_fromstage_enum ADD VALUE IF NOT EXISTS 'ULCCS Approval'",
      "ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Legal Review'",
      "ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Delivery Review'",
      "ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Procurement Review'",
      "ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Finance Review'",
      "ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'Client Review'",
      "ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'CEO Approval'",
      "ALTER TYPE agreement_stage_history_tostage_enum ADD VALUE IF NOT EXISTS 'ULCCS Approval'",
    ];

    for (const statement of statements) {
      try {
        await client.query(statement);
        console.log('✓', statement);
      } catch (error: any) {
        if (error.code === '23505') {
          // Duplicate value
          console.log('⊚ Value already exists:', statement);
        } else {
          console.error('✗ Error:', statement, error.message);
        }
      }
    }

    // Verify
    const fromResult = await client.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'agreement_stage_history_fromstage_enum'::regtype ORDER BY enumsortorder",
    );
    console.log(
      '\nFromStage enum values:',
      fromResult.rows.map((r) => r.enumlabel),
    );

    const toResult = await client.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'agreement_stage_history_tostage_enum'::regtype ORDER BY enumsortorder",
    );
    console.log(
      'ToStage enum values:',
      toResult.rows.map((r) => r.enumlabel),
    );

    console.log('\n✓ Enum update completed successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateEnums();
