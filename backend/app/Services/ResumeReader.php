<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser;
use ZipArchive;

/** Pulls plain text out of a stored resume (PDF or Word .docx). */
class ResumeReader
{
    /** Enough for any normal resume; the rest would only cost AI tokens. */
    private const MAX_CHARS = 8000;

    public function text(string $path): ?string
    {
        if (! Storage::exists($path)) {
            return null;
        }

        $absolute = Storage::path($path);

        try {
            $text = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
                'pdf' => $this->fromPdf($absolute),
                'docx' => $this->fromDocx($absolute),
                default => null,
            };
        } catch (\Throwable) {
            return null;
        }

        if ($text === null) {
            return null;
        }

        $text = trim(preg_replace('/[ \t]+/', ' ', preg_replace('/\R{3,}/', "\n\n", $text) ?? '') ?? '');

        return $text === '' ? null : mb_substr($text, 0, self::MAX_CHARS);
    }

    private function fromPdf(string $file): string
    {
        return (new Parser)->parseFile($file)->getText();
    }

    private function fromDocx(string $file): ?string
    {
        $zip = new ZipArchive;
        if ($zip->open($file) !== true) {
            return null;
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            return null;
        }

        // Paragraph ends become line breaks, then every other tag is dropped.
        $xml = preg_replace('/<\/w:p>/', "\n", $xml) ?? $xml;

        return html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
