<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('headline', 120)->nullable()->after('location');
            $table->text('summary')->nullable()->after('headline');
            $table->string('website', 200)->nullable()->after('summary');
            // Lists are kept as JSON on the user: they are always read and saved together with the profile.
            $table->json('skills')->nullable()->after('website');
            $table->json('experience')->nullable()->after('skills');
            $table->json('education')->nullable()->after('experience');
            $table->json('certifications')->nullable()->after('education');
            $table->json('languages')->nullable()->after('certifications');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['headline', 'summary', 'website', 'skills', 'experience', 'education', 'certifications', 'languages']);
        });
    }
};
