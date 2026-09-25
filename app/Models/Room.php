<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Room extends Model {
    protected $guarded = [];

    public function bookings(): HasMany {
        return $this->hasMany(Booking::class);
    }

    public function activeBooking(): HasOne {
        return $this->hasOne(Booking::class)->where('status', 'In House')->latestOfMany();
    }
}
