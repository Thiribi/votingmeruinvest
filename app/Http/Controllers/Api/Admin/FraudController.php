<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\FraudFlagResource;
use App\Models\AuditLog;
use App\Models\FraudFlag;
use App\Models\Vote;
use Illuminate\Http\Request;

class FraudController extends Controller
{
    /** Statuses that count as "the reviewer has dealt with this flag". */
    private const RESOLVED_STATUSES = ['cleared', 'invalidated', 'cancelled'];

    /** Computed in PHP (not raw SQL) so it works the same across MySQL/SQLite drivers. */
    public function stats()
    {
        $resolvedToday = FraudFlag::whereIn('status', self::RESOLVED_STATUSES)
            ->whereDate('updated_at', now()->toDateString())
            ->count();

        $resolved = FraudFlag::whereIn('status', self::RESOLVED_STATUSES)
            ->get(['created_at', 'updated_at']);

        $avgReviewSeconds = $resolved->isEmpty()
            ? 0
            : (int) round($resolved->avg(fn (FraudFlag $f) => $f->created_at->diffInSeconds($f->updated_at)));

        return response()->json([
            'resolved_today' => $resolvedToday,
            'avg_review_seconds' => $avgReviewSeconds,
        ]);
    }

    public function index(Request $request)
    {
        $flags = FraudFlag::query()
            ->with(['campaign', 'vote.option', 'vote.paymentTransaction'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return FraudFlagResource::collection($flags);
    }

    /**
     * "Clear" is the admin explicitly validating the flagged activity as legitimate — the
     * underlying vote is (re)confirmed as verified in the votes table, same as any other
     * validated vote, rather than just dismissing the flag on its own.
     */
    public function clear(Request $request, FraudFlag $fraud)
    {
        $fraud->update(['status' => 'cleared']);

        if ($fraud->vote && $fraud->vote->vote_status !== 'verified') {
            $fraud->vote->update(['vote_status' => 'verified']);
        }

        AuditLog::record($request->user(), 'fraud.cleared', "Validated vote and cleared fraud flag {$fraud->code()}", $fraud);

        return $this->fresh($fraud);
    }

    /**
     * "Invalidate" rejects the flagged vote (it stops counting toward any tally) but leaves
     * the payment untouched — the fan paid, the vote was fraudulent, no refund.
     */
    public function invalidate(Request $request, FraudFlag $fraud)
    {
        $fraud->update(['status' => 'invalidated']);

        if ($fraud->vote) {
            $this->reverseVoteTally($fraud->vote);
            $fraud->vote->update(['vote_status' => 'rejected']);
        }

        AuditLog::record($request->user(), 'fraud.invalidated', "Invalidated vote for fraud flag {$fraud->code()}", $fraud);

        return $this->fresh($fraud);
    }

    /**
     * "Cancel" voids the whole event: the vote is rejected AND its M-Pesa transaction is
     * marked cancelled so finance can refund it. Use for accidental, duplicate or test votes
     * rather than genuine fraud.
     */
    public function cancel(Request $request, FraudFlag $fraud)
    {
        $fraud->update(['status' => 'cancelled']);

        if ($fraud->vote) {
            $this->reverseVoteTally($fraud->vote);
            $fraud->vote->update(['vote_status' => 'rejected']);
            $fraud->vote->paymentTransaction?->update(['status' => 'cancelled']);
        }

        AuditLog::record($request->user(), 'fraud.cancelled', "Cancelled vote and payment for fraud flag {$fraud->code()}", $fraud);

        return $this->fresh($fraud);
    }

    /** Roll back the vote-count increments a verified vote made, so tallies stay honest. */
    private function reverseVoteTally(Vote $vote): void
    {
        if ($vote->vote_status !== 'verified') {
            return;
        }

        $vote->loadMissing('option.nominee');

        if ($vote->option && $vote->option->votes_count > 0) {
            $vote->option->decrement('votes_count');
        }

        if ($vote->option?->nominee && $vote->option->nominee->votes_count > 0) {
            $vote->option->nominee->decrement('votes_count');
        }
    }

    private function fresh(FraudFlag $fraud): FraudFlagResource
    {
        return new FraudFlagResource($fraud->load(['campaign', 'vote.option', 'vote.paymentTransaction']));
    }
}
