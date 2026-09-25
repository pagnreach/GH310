<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('expense_category'); // e.g. Cleaning Supplies, Maintenance, Utility, Food/Staff, Other
            $table->string('title');
            $table->decimal('amount_khr', 12, 2);
            $table->string('payment_method')->default('KHR Cash'); // KHR Cash or ABA Bank
            $table->string('paid_by')->nullable(); // Reception staff name
            $table->string('shift')->default('Morning');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('expenses');
    }
};
