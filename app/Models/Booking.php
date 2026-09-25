<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model {
    protected $fillable = [
        'booking_code',
        'guest_name',
        'room_id',
        'check_in',
        'check_out',
        'nights',
        'room_charge_usd',
        'total_paid_usd',
        'balance_usd',
        'status',
        'notes',
    ];

    public function room(): BelongsTo {
        return $this->belongsTo(Room::class);
    }

    public function payment_transactions(): HasMany {
        return $this->hasMany(PaymentTransaction::class);
    }

    public function payments(): HasMany {
        return $this->hasMany(PaymentTransaction::class);
    }
}
