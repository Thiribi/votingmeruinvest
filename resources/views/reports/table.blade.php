<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 30px 26px 60px 26px;
        }

        * { box-sizing: border-box; }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9px;
            color: #1F2937;
        }

        /* Plain, normal-flow header — a page in normal document flow can never overlap
           anything else on it; the previous fixed-position letterhead could (and did). */
        .header {
            text-align: center;
            padding-bottom: 10px;
            margin-bottom: 14px;
            border-bottom: 3px solid #F97316;
        }
        .header img { height: 46px; }
        .header .title { color: #12355B; font-size: 18px; font-weight: 700; margin: 8px 0 3px; }
        .header .subtitle { color: #2F80ED; font-size: 9px; font-weight: 600; }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        th, td {
            border: 1px solid #E2E8F0;
            padding: 4px 5px;
            text-align: left;
            word-wrap: break-word;
            overflow-wrap: anywhere;
        }
        th {
            background: #12355B;
            color: #FFFFFF;
            font-weight: 700;
            font-size: 8.5px;
            text-transform: uppercase;
        }
        tr:nth-child(even) td { background: #F8FAFC; }

        .footnote {
            margin-top: 14px;
            color: #94A3B8;
            font-size: 8px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="{{ $logoSrc }}" alt="FansBench">
        <p class="title">{{ $title }} report</p>
        <p class="subtitle">{{ $rangeLabel }} &middot; Generated {{ $generatedAt }} by {{ $generatedBy }} &middot; {{ count($rows) }} rows</p>
    </div>

    <table>
        <thead>
            <tr>
                @foreach ($columns as $column)
                    <th>{{ $column }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr>
                    @foreach ($row as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>

    <p class="footnote">FansBench &middot; Verified fan voting &amp; reputation &middot; Confidential admin report</p>
</body>
</html>
