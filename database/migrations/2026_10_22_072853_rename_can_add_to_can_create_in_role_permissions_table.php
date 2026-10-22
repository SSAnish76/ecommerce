<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('role_permissions', 'can_add')) {
            Schema::table('role_permissions', function (Blueprint $table) {
                $table->renameColumn('can_add', 'can_create');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('role_permissions', 'can_create')) {
            Schema::table('role_permissions', function (Blueprint $table) {
                $table->renameColumn('can_create', 'can_add');
            });
        }
    }
};
