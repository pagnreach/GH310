<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model {
    protected $fillable = [
        'title',
        'amount_khr',
        'amount_usd',
        'expense_category',
        'payment_method',
        'paid_by',
        'shift',
        'notes',
    ];

    protected $casts = [
        'amount_khr' => 'float',
        'amount_usd' => 'float',
    ];
}
