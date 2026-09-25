<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('bank_transfers', function (Blueprint $table) {
            if (!Schema::hasColumn('bank_transfers', 'transfer_category')) {
                $table->string('transfer_category')->default('TRANSFER'); // 'TRANSFER' or 'CONVERT'
            }
            if (!Schema::hasColumn('bank_transfers', 'exchange_rate')) {
                $table->decimal('exchange_rate', 10, 2)->default(4000);
            }
        });
    }

    public function down(): void {
        Schema::table('bank_transfers', function (Blueprint $table) {
            $table->dropColumn(['transfer_category', 'exchange_rate']);
        });
    }
};
