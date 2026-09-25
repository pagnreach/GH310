<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankTransfer extends Model {
    protected $fillable = [
        'transfer_date',
        'from_account',
        'to_account',
        'usd_amount',
        'khr_amount',
        'transfer_category',
        'exchange_rate',
        'notes',
        'recorded_by',
    ];
}
