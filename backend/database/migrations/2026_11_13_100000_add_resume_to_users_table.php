<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('resume_path')->nullable()->after('location');
            $table->string('resume_name', 160)->nullable()->after('resume_path');
            $table->unsignedInteger('resume_size')->nullable()->after('resume_name');
            $table->timestamp('resume_uploaded_at')->nullable()->after('resume_size');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['resume_path', 'resume_name', 'resume_size', 'resume_uploaded_at']);
        });
    }
};
