<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\FraudFlag;
use App\Models\Organization;
use App\Models\OtpChallenge;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Models\Vote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'verified_voters' => User::whereNotNull('verified_at')->count(),
            'votes_24h' => Vote::where('created_at', '>=', now()->subDay())->count(),
            'open_fraud_flags' => FraudFlag::where('status', 'open')->count(),
            'active_campaigns' => Campaign::where('status', 'live')->count(),
            'mpesa_reconciliation_pct' => $this->mpesaReconciliationPct(),
            'otp_delivery_pct' => $this->otpDeliveryPct(),
            'fraud_sla_pct' => $this->fraudSlaPct(),
            'revenue_30d' => (float) PaymentTransaction::where('status', 'completed')
                ->where('created_at', '>=', now()->subDays(30))
                ->sum('amount'),
            'votes_30d' => Vote::where('created_at', '>=', now()->subDays(30))->count(),
            'pending_transactions' => PaymentTransaction::where('status', 'pending')->count(),
            'total_fans' => User::where('role', 'fan')->count(),
        ]);
    }

    /**
     * Daily votes cast + M-Pesa revenue collected over the trailing `$days` days, oldest
     * first, zero-filled so the chart doesn't have gaps on quiet days.
     */
    public function series(Request $request)
    {
        $days = min(90, max(7, $request->integer('days', 14)));
        $start = now()->startOfDay()->subDays($days - 1);

        $votesByDay = Vote::where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $revenueByDay = PaymentTransaction::where('status', 'completed')
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as day, SUM(amount) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $start->copy()->addDays($i)->toDateString();
            $series[] = [
                'date' => $date,
                'votes' => (int) ($votesByDay[$date] ?? 0),
                'revenue' => (float) ($revenueByDay[$date] ?? 0),
            ];
        }

        return response()->json(['data' => $series]);
    }

    /** Latest M-Pesa transactions across both guest and account-holder voting, for the dashboard's activity feed. */
    public function transactions(Request $request)
    {
        $transactions = PaymentTransaction::with('user:id,name')
            ->latest()
            ->limit($request->integer('limit', 10))
            ->get()
            ->map(fn (PaymentTransaction $t) => [
                'id' => $t->id,
                'payer' => $t->user?->name ?? 'Guest',
                'phone_number' => $t->phone_number,
                'amount' => (float) $t->amount,
                'status' => $t->status,
                'provider_reference' => $t->provider_reference,
                'created_at' => $t->created_at?->toISOString(),
            ]);

        return response()->json(['data' => $transactions]);
    }

    /**
     * Votes and (fairly attributed) revenue per organization, top earners first. A single
     * M-Pesa transaction can pay for a batch of votes spanning several organizations' campaigns
     * (cart checkout charges one flat fee for the whole slip), so each completed transaction's
     * amount is split across organizations in proportion to how many of its votes belong to
     * each — e.g. 3 of 4 votes for org A and 1 for org B in one transaction splits it 75/25.
     */
    public function organizations(Request $request)
    {
        $votesByOrg = Vote::query()
            ->join('campaigns', 'campaigns.id', '=', 'votes.campaign_id')
            ->whereNotNull('campaigns.organization_id')
            ->where('votes.vote_status', 'verified')
            ->selectRaw('campaigns.organization_id as organization_id, COUNT(*) as total')
            ->groupBy('campaigns.organization_id')
            ->pluck('total', 'organization_id');

        $revenueRows = DB::table('votes')
            ->join('campaigns', 'campaigns.id', '=', 'votes.campaign_id')
            ->join('payment_transactions', 'payment_transactions.id', '=', 'votes.payment_transaction_id')
            ->where('payment_transactions.status', 'completed')
            ->whereNotNull('campaigns.organization_id')
            ->select('payment_transactions.id as transaction_id', 'payment_transactions.amount', 'campaigns.organization_id')
            ->get();

        $revenueByOrg = [];
        foreach ($revenueRows->groupBy('transaction_id') as $txRows) {
            $amount = (float) $txRows->first()->amount;
            $totalVotesInTx = $txRows->count();
            foreach ($txRows->countBy('organization_id') as $organizationId => $count) {
                $revenueByOrg[$organizationId] = ($revenueByOrg[$organizationId] ?? 0) + $amount * ($count / $totalVotesInTx);
            }
        }

        $organizations = Organization::withCount('campaigns')
            ->get(['id', 'name', 'logo_url'])
            ->map(fn (Organization $org) => [
                'id' => $org->id,
                'name' => $org->name,
                'logo_url' => $org->logo_url,
                'campaigns_count' => $org->campaigns_count,
                'votes' => (int) ($votesByOrg[$org->id] ?? 0),
                'revenue' => round($revenueByOrg[$org->id] ?? 0, 2),
            ])
            ->filter(fn (array $row) => $row['votes'] > 0 || $row['revenue'] > 0)
            ->sortByDesc('revenue')
            ->values();

        return response()->json(['data' => $organizations]);
    }

    /** Share of M-Pesa transactions (last 30 days) that completed, out of every attempt that reached a final state. */
    private function mpesaReconciliationPct(): ?float
    {
        $transactions = PaymentTransaction::where('created_at', '>=', now()->subDays(30))
            ->whereIn('status', ['completed', 'failed', 'cancelled'])
            ->get(['status']);

        if ($transactions->isEmpty()) {
            return null;
        }

        return round($transactions->where('status', 'completed')->count() / $transactions->count() * 100, 1);
    }

    /** Share of OTP challenges (last 30 days) that were successfully verified. */
    private function otpDeliveryPct(): ?float
    {
        $challenges = OtpChallenge::where('created_at', '>=', now()->subDays(30))->get(['verified_at']);

        if ($challenges->isEmpty()) {
            return null;
        }

        return round($challenges->whereNotNull('verified_at')->count() / $challenges->count() * 100, 1);
    }

    /** Share of fraud flags older than 24h that have already been reviewed (cleared/invalidated). */
    private function fraudSlaPct(): ?float
    {
        $due = FraudFlag::where('created_at', '<=', now()->subHours(24))->get(['status']);

        if ($due->isEmpty()) {
            return null;
        }

        return round($due->whereIn('status', ['cleared', 'invalidated'])->count() / $due->count() * 100, 1);
    }
}
