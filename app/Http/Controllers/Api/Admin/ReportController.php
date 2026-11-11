<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\ReportReadyMail;
use App\Models\AuditLog;
use App\Models\PaymentTransaction;
use App\Models\Vote;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Admin Reports: on-screen paginated tables (recent 10 by default, or a chosen date range),
 * plus PDF/Excel exports of the full matching range — every export is emailed to whoever
 * generated it (not just handed back as a browser download) and audit-logged.
 */
class ReportController extends Controller
{
    private const VOTE_COLUMNS = [
        'Vote ID', 'Date/Time', 'Status', 'Campaign', 'Nominee/Option', 'Voter Name', 'Voter Email',
        'Voter Phone', 'Guest Phone', 'M-Pesa Reference', 'Amount Paid (KES)', 'County', 'Latitude',
        'Longitude', 'IP Address', 'Feedback',
    ];

    private const REVENUE_COLUMNS = [
        'Transaction ID', 'Date/Time', 'Status', 'Payer Name', 'Payer Email', 'Phone Number',
        'Amount (KES)', 'Provider', 'Provider Reference',
    ];

    /** On-screen paginated table — recent activity by default, or a picked date range. */
    public function votes(Request $request)
    {
        [$from, $to] = $this->resolveRange($request);

        $paginator = Vote::query()
            ->with(['campaign:id,title', 'option:id,label,nominee_id', 'option.nominee:id,name', 'voter:id,name,email,phone', 'paymentTransaction:id,amount', 'county:id,name'])
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 10));

        $paginator->getCollection()->transform(fn (Vote $vote) => $this->voteRow($vote));

        return $this->paginatedResponse($paginator);
    }

    public function revenue(Request $request)
    {
        [$from, $to] = $this->resolveRange($request);

        $paginator = PaymentTransaction::query()
            ->with('user:id,name,email')
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 10));

        $paginator->getCollection()->transform(fn (PaymentTransaction $tx) => $this->revenueRow($tx));

        return $this->paginatedResponse($paginator);
    }

    /** Matches this app's `Paginated<T>` frontend contract (data + nested meta), not Laravel's raw paginator shape. */
    private function paginatedResponse($paginator)
    {
        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /** Full matching range as a PDF or XLSX — downloaded in the browser and emailed to the requester. */
    public function exportVotes(Request $request)
    {
        [$from, $to] = $this->resolveRange($request);
        $format = $request->input('format', 'pdf') === 'xlsx' ? 'xlsx' : 'pdf';

        $rows = Vote::query()
            ->with(['campaign:id,title', 'option:id,label,nominee_id', 'option.nominee:id,name', 'voter:id,name,email,phone', 'paymentTransaction:id,amount', 'county:id,name'])
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Vote $vote) => array_values($this->voteRow($vote)));

        return $this->export($request, 'Votes cast', self::VOTE_COLUMNS, $rows, $from, $to, $format);
    }

    public function exportRevenue(Request $request)
    {
        [$from, $to] = $this->resolveRange($request);
        $format = $request->input('format', 'pdf') === 'xlsx' ? 'xlsx' : 'pdf';

        $rows = PaymentTransaction::query()
            ->with('user:id,name,email')
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (PaymentTransaction $tx) => array_values($this->revenueRow($tx)));

        return $this->export($request, 'Revenue', self::REVENUE_COLUMNS, $rows, $from, $to, $format);
    }

    private function voteRow(Vote $vote): array
    {
        return [
            'id' => $vote->id,
            'date' => $vote->created_at?->toDateTimeString(),
            'status' => $vote->vote_status,
            'campaign' => $vote->campaign?->title,
            'nominee' => $vote->option?->nominee?->name ?? $vote->option?->label,
            'voter_name' => $vote->voter?->name,
            'voter_email' => $vote->voter?->email,
            'voter_phone' => $vote->voter?->phone,
            'guest_phone' => $vote->voter_phone,
            'mpesa_reference' => $vote->mpesa_reference,
            'amount' => $vote->paymentTransaction?->amount,
            'county' => $vote->county?->name,
            'latitude' => $vote->latitude,
            'longitude' => $vote->longitude,
            'ip_address' => $vote->ip_address,
            'feedback' => $vote->feedback,
        ];
    }

    private function revenueRow(PaymentTransaction $tx): array
    {
        return [
            'id' => $tx->id,
            'date' => $tx->created_at?->toDateTimeString(),
            'status' => $tx->status,
            'payer_name' => $tx->user?->name,
            'payer_email' => $tx->user?->email,
            'phone_number' => $tx->phone_number,
            'amount' => $tx->amount,
            'provider' => $tx->provider,
            'provider_reference' => $tx->provider_reference,
        ];
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function resolveRange(Request $request): array
    {
        $from = $request->filled('from') ? Carbon::parse($request->input('from'))->startOfDay() : now()->subDays(30)->startOfDay();
        $to = $request->filled('to') ? Carbon::parse($request->input('to'))->endOfDay() : now()->endOfDay();

        return [$from, $to];
    }

    private function export(Request $request, string $label, array $columns, $rows, Carbon $from, Carbon $to, string $format): StreamedResponse
    {
        $generatedAt = now();
        $generatedBy = $request->user();
        $rangeLabel = "{$from->toFormattedDateString()} – {$to->toFormattedDateString()}";
        $baseName = strtolower(str_replace(' ', '-', $label)).'-'.$from->toDateString().'-to-'.$to->toDateString();

        if ($format === 'xlsx') {
            $fileName = "{$baseName}.xlsx";
            $mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            $contents = $this->buildXlsx($columns, $rows);
        } else {
            $fileName = "{$baseName}.pdf";
            $mime = 'application/pdf';
            // Wide tables (votes has 16 columns) need landscape to avoid columns overlapping —
            // portrait was clipping/overlapping cells regardless of font size.
            $pdf = Pdf::loadView('reports.table', [
                'title' => $label,
                'rangeLabel' => $rangeLabel,
                'generatedAt' => $generatedAt->toDayDateTimeString(),
                'generatedBy' => $generatedBy?->name ?? 'Unknown',
                'columns' => $columns,
                'rows' => $rows,
                'logoSrc' => $this->logoDataUri(),
            ])->setPaper('a4', 'landscape');

            // page_script() only has pages to draw on once the document has actually been
            // rendered, so render explicitly before stamping — output() below then sees
            // rendered=true and just finalizes the bytes rather than re-rendering.
            $pdf->render();
            $this->stampEveryPage($pdf->getDomPDF()->getCanvas());
            $contents = $pdf->output();
        }

        AuditLog::record($generatedBy, 'report.exported', "Exported {$label} report ({$fileName})");

        if ($generatedBy?->email) {
            Mail::to($generatedBy->email)->send(new ReportReadyMail(
                name: $generatedBy->first_name ?? $generatedBy->name,
                reportLabel: $label,
                rangeLabel: $rangeLabel,
                fileContents: $contents,
                fileName: $fileName,
                mimeType: $mime,
            ));
        }

        return response()->streamDownload(fn () => print ($contents), $fileName, ['Content-Type' => $mime]);
    }

    /** Embeds the brand logo as a data URI so dompdf never needs a remote/file-path fetch. */
    private function logoDataUri(): string
    {
        $path = public_path('fansbench-brand.png');

        if (! is_file($path)) {
            return '';
        }

        return 'data:image/png;base64,'.base64_encode(file_get_contents($path));
    }

    /**
     * Draws directly on the finished PDF canvas rather than via CSS — a large, very faint
     * centered watermark (the "overlay", inspired by the reference e-receipt's pale central
     * emblem) plus a faded FansBench stamp pinned to the bottom of every page. This runs
     * after layout and paints over the already-rendered content, so — unlike the old CSS
     * `position: fixed` letterhead, which mis-measured itself and cut a line straight through
     * the table — there is no possible overlap with the table: opacity is all that keeps the
     * report readable underneath.
     */
    private function stampEveryPage($canvas): void
    {
        $logoPath = public_path('fansbench-brand.png');

        if (! is_file($logoPath)) {
            return;
        }

        $size = @getimagesize($logoPath);
        $aspect = $size ? $size[1] / $size[0] : 258 / 968;

        $canvas->page_script(function ($pageNumber, $pageCount, $canvas, $fontMetrics) use ($logoPath, $aspect) {
            $pageWidth = $canvas->get_width();
            $pageHeight = $canvas->get_height();

            // Overlay: one large, barely-there mark centered on the page.
            $markWidth = $pageWidth * 0.45;
            $markHeight = $markWidth * $aspect;
            $canvas->set_opacity(0.05);
            $canvas->image($logoPath, ($pageWidth - $markWidth) / 2, ($pageHeight - $markHeight) / 2, $markWidth, $markHeight);
            $canvas->set_opacity(1.0);

            // Stamp: small, faded, bottom-center of every page.
            $stampWidth = 70;
            $stampHeight = $stampWidth * $aspect;
            $stampX = ($pageWidth - $stampWidth) / 2;
            $stampY = $pageHeight - $stampHeight - 22;

            $canvas->set_opacity(0.35);
            $canvas->image($logoPath, $stampX, $stampY, $stampWidth, $stampHeight);

            $font = $fontMetrics->getFont('helvetica', 'bold');
            $label = 'VERIFIED FANSBENCH REPORT';
            $labelWidth = $fontMetrics->getTextWidth($label, $font, 6.5);
            $canvas->page_text(($pageWidth - $labelWidth) / 2, $stampY + $stampHeight + 3, $label, $font, 6.5, [0.15, 0.21, 0.36]);
            $canvas->set_opacity(1.0);
        });
    }

    private function buildXlsx(array $columns, $rows): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray($columns, null, 'A1');
        $sheet->fromArray($rows->toArray(), null, 'A2');
        foreach (range('A', $sheet->getHighestColumn()) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);

        ob_start();
        $writer->save('php://output');

        return ob_get_clean();
    }
}
