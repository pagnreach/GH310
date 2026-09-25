<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Tracks message IDs sent to housekeeping channel
        Schema::create('housekeeping_tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('telegram_message_id')->index();
            $table->foreignId('room_id')->constrained('rooms');
            $table->foreignId('booking_id')->nullable()->constrained('bookings');
            $table->enum('status', ['waiting', 'cleaned', 'maintenance', 'lost_and_found'])->default('waiting');
            $table->string('cleaned_by')->nullable();
            $table->timestamp('reacted_at')->nullable();
            $table->timestamps();
        });

        // Tracks owner cash commands: "took 50 usd", "bank return 100000 khr"
        Schema::create('cash_drawer_adjustments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('telegram_message_id')->nullable()->unique();
            $table->string('username');
            $table->enum('action', ['TOOK', 'RETURN', 'BANK TOOK', 'BANK RETURN']);
            $table->decimal('usd_amount', 10, 2)->default(0);
            $table->decimal('khr_amount', 14, 2)->default(0);
            $table->text('raw_message')->nullable();
            $table->timestamps();
        });

        // Maintenance Log
        Schema::create('maintenance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('rooms');
            $table->string('reported_by');
            $table->boolean('is_fixed')->default(false);
            $table->timestamps();
        });

        // Lost and Found
        Schema::create('lost_and_founds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('rooms');
            $table->string('reported_by');
            $table->boolean('is_resolved')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('lost_and_founds');
        Schema::dropIfExists('maintenance_logs');
        Schema::dropIfExists('cash_drawer_adjustments');
        Schema::dropIfExists('housekeeping_tasks');
    }
};
