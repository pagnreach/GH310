<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // 1. Rooms & Cleaning Status (Replaces Dashboard & Cleaning sheets)
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('room_number')->unique(); // G1, 101, 102...
            $table->enum('room_type', ['Single', 'Double']);
            $table->enum('status', ['vacant', 'occupied', 'dirty', 'maintenance'])->default('vacant');
            $table->decimal('default_rate_usd', 8, 2)->default(15.00);
            $table->boolean('is_cleaned')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 2. Bookings (Replaces Guest Registration Log)
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_code')->unique(); // B0001, B0002...
            $table->string('guest_name');            // G001 or Name
            $table->foreignId('room_id')->constrained('rooms');
            $table->date('check_in');
            $table->date('check_out');
            $table->integer('nights')->default(1);
            $table->decimal('room_charge_usd', 10, 2);
            $table->decimal('total_paid_usd', 10, 2)->default(0);
            $table->decimal('balance_usd', 10, 2)->default(0);
            $table->enum('status', ['In House', 'Checked Out', 'Cancelled'])->default('In House');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 3. Transactions / Cashier Log (Replaces Cashier Report & Macro buttons)
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->onDelete('cascade');
            $table->enum('action', ['Add Order', 'Add Payment', 'Refund', 'Cancel Order']);
            $table->decimal('usd_cash', 10, 2)->default(0);
            $table->decimal('khr_cash', 12, 2)->default(0);
            $table->decimal('usd_bank', 10, 2)->default(0); // ABA USD
            $table->decimal('khr_bank', 12, 2)->default(0); // ABA KHR
            $table->decimal('exchange_rate', 8, 2)->default(4100.00);
            $table->decimal('total_paid_usd', 10, 2);
            $table->string('shift');                         // Morning / Evening
            $table->string('handled_by');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('rooms');
    }
};
