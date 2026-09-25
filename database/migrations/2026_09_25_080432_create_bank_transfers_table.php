<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('bank_transfers', function (Blueprint $table) {
            $table->id();
            $table->date('transfer_date');
            $table->string('from_account'); // 'Cash', 'ACLEDA', 'Wing'
            $table->string('to_account');   // 'ACLEDA', 'Wing', 'Cash'
            $table->decimal('usd_amount', 12, 2)->default(0);
            $table->decimal('khr_amount', 15, 2)->default(0);
            $table->string('notes')->nullable();
            $table->string('recorded_by')->default('Admin');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('bank_transfers');
    }
};
