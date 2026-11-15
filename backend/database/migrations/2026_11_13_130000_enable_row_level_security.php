<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Supabase gives every table a public web API. Switching on Row Level Security
 * with no rules means that API can read nothing. Laravel connects as the table
 * owner, which is not affected by RLS, so the app keeps working.
 *
 * Only PostgreSQL has this feature, so SQLite (local) skips it. Any table added
 * later needs the same line in its own migration.
 */
return new class extends Migration
{
    private const TABLES = ['users', 'personal_access_tokens', 'migrations'];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLES as $table) {
            DB::statement("ALTER TABLE \"{$table}\" ENABLE ROW LEVEL SECURITY");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLES as $table) {
            DB::statement("ALTER TABLE \"{$table}\" DISABLE ROW LEVEL SECURITY");
        }
    }
};
