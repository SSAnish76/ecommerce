<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'role_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignUuid('role_id')->nullable()->after('email')->constrained('roles')->nullOnDelete();
            });
        }

        if (Schema::hasTable('role_user')) {
            $assignments = DB::table('role_user')->get();
            foreach ($assignments as $assignment) {
                DB::table('users')
                    ->where('id', $assignment->user_id)
                    ->whereNull('role_id')
                    ->update(['role_id' => $assignment->role_id]);
            }

            Schema::dropIfExists('role_user');
        }

        Schema::dropIfExists('menu_role');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('role_user')) {
            Schema::create('role_user', function (Blueprint $table) {
                $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
                $table->foreignUuid('role_id')->constrained()->cascadeOnDelete();
                $table->primary(['user_id', 'role_id']);
            });

            $users = DB::table('users')->whereNotNull('role_id')->get(['id', 'role_id']);
            foreach ($users as $user) {
                DB::table('role_user')->insertOrIgnore([
                    'user_id' => $user->id,
                    'role_id' => $user->role_id,
                ]);
            }
        }

        if (! Schema::hasTable('menu_role')) {
            Schema::create('menu_role', function (Blueprint $table) {
                $table->string('menu_slug');
                $table->foreignUuid('role_id')->constrained()->cascadeOnDelete();
                $table->foreign('menu_slug')->references('slug')->on('menus')->cascadeOnDelete();
                $table->primary(['menu_slug', 'role_id']);
                $table->timestamps();
            });
        }

        if (Schema::hasColumn('users', 'role_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['role_id']);
                $table->dropColumn('role_id');
            });
        }
    }
};
